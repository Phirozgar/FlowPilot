from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Task
from .serializers import TaskSerializer, TaskListSerializer

User = get_user_model()


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for task management with 2-step approval workflow.
    - Step 1: MANAGER reviews and approves/rejects
    - Step 2: ADMIN reviews and approves/rejects
    """
    
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter tasks based on user role:
        - Admins & Managers: see all tasks
        - Regular users: see tasks they created or are assigned to
        """
        user = self.request.user
        
        if user.is_manager():
            return Task.objects.all()
        
        return Task.objects.filter(
            Q(created_by=user) | Q(assigned_to=user)
        )
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return TaskListSerializer
        return TaskSerializer
    
    def perform_create(self, serializer):
        """Attach creator and rely on model defaults for initial status.

        Permission checks are handled in `create` so this method only
        mutates the validated data and saves the instance.
        """
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Only regular users are allowed to create tasks."""
        if not request.user.is_regular_user():
            return Response(
                {'detail': 'Only regular users can create tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Only creator, manager or admin may modify a task."""
        task = self.get_object()
        user = request.user
        if user.is_regular_user() and task.created_by != user:
            return Response({'detail': 'You may only edit tasks you created.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        user = request.user
        if user.is_regular_user() and task.created_by != user:
            return Response({'detail': 'You may only delete tasks you created.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """
        Approve task based on current approval step.
        Step 1 (MANAGER): Move to step 2
        Step 2 (ADMIN): Set status to Approved
        """
        task = self.get_object()
        user = request.user
        
        # Step 1: MANAGER review
        if task.approval_step == 1:
            if not user.is_manager():
                return Response(
                    {'detail': 'Only managers (or admins) can approve at step 1.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            # manager approval advances workflow to admin review
            task.approval_step = 2
            task.status = 'in_review'
            task.save()
            return Response(
                {
                    'detail': 'Task approved by manager. Moved to step 2 (Admin review).',
                    'task': TaskSerializer(task, context={'request': request}).data
                },
                status=status.HTTP_200_OK
            )
        
        # Step 2: ADMIN approval
        elif task.approval_step == 2:
            if not user.is_admin():
                return Response(
                    {'detail': 'Only admins can approve at step 2.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            task.status = 'approved'
            task.save()
            return Response(
                {
                    'detail': 'Task approved by admin. Status set to Approved.',
                    'task': TaskSerializer(task, context={'request': request}).data
                },
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'detail': 'Task cannot be approved at this step.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """
        Reject task at any step.
        Both MANAGER and ADMIN can reject.
        """
        task = self.get_object()
        user = request.user
        
        # Step 1: MANAGER can reject
        if task.approval_step == 1:
            if not user.is_manager():
                return Response(
                    {'detail': 'Only managers (or admins) can reject at step 1.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            task.status = 'rejected'
            task.save()
            return Response(
                {
                    'detail': 'Task rejected by manager.',
                    'task': TaskSerializer(task, context={'request': request}).data
                },
                status=status.HTTP_200_OK
            )
        
        # Step 2: ADMIN can reject
        elif task.approval_step == 2:
            if not user.is_admin():
                return Response(
                    {'detail': 'Only admins can reject at step 2.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            task.status = 'rejected'
            task.save()
            return Response(
                {
                    'detail': 'Task rejected by admin.',
                    'task': TaskSerializer(task, context={'request': request}).data
                },
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'detail': 'Task cannot be rejected at this step.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """Return tasks that are waiting for manager approval (status pending)."""
        tasks = self.get_queryset().filter(status='pending')
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Get tasks assigned to current user."""
        tasks = self.get_queryset().filter(assigned_to=request.user)
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def created_by_me(self, request):
        """Get tasks created by current user."""
        tasks = self.get_queryset().filter(created_by=request.user)
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Filter tasks by status query parameter."""
        status_q = request.query_params.get('status')
        if not status_q:
            return Response({'error': 'status parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        tasks = self.get_queryset().filter(status=status_q)
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def assign(self, request, pk=None):
        """Assign a task to a user (manager/admin only)."""
        task = self.get_object()
        user = request.user
        if not user.is_manager():
            return Response({'detail': 'Only managers or admins can assign tasks.'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            assignee = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        task.assigned_to = assignee
        task.save()
        return Response({'detail': 'Task assigned', 'task': TaskSerializer(task, context={'request': request}).data})

    @action(detail=True, methods=['patch'])
    def change_status(self, request, pk=None):
        """Manually change a task's status if authorized."""
        task = self.get_object()
        user = request.user
        allowed = user.is_manager() or task.created_by == user or task.assigned_to == user
        if not allowed:
            return Response({'detail': 'Not permitted to change status.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        if new_status not in dict(Task.STATUS_CHOICES):
            return Response({'error': 'Invalid status value'}, status=status.HTTP_400_BAD_REQUEST)
        task.status = new_status
        task.save()
        return Response({'detail': 'Status updated', 'task': TaskSerializer(task, context={'request': request}).data})
