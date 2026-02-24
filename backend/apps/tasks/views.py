from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Task
from .serializers import TaskSerializer, TaskListSerializer


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
        """Create task with current user as creator. Only users can create."""
        if not self.request.user.is_regular_user():
            return Response(
                {'detail': 'Only regular users can create tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer.save(created_by=self.request.user, status='in_review')
    
    def create(self, request, *args, **kwargs):
        """Override create to check permissions."""
        if not request.user.is_regular_user():
            return Response(
                {'detail': 'Only regular users can create tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """
        Approve task based on current approval step.
        Step 1 (MANAGER): Move to step 2
        Step 2 (ADMIN): Set status to Approved
        """
        task = self.get_object()
        user = request.user
        
        # Step 1: MANAGER approval
        if task.approval_step == 1:
            if not user.is_manager() or user.is_regular_user():
                return Response(
                    {'detail': 'Only managers can approve at step 1.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            task.approval_step = 2
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
            if not user.is_manager() or user.is_regular_user():
                return Response(
                    {'detail': 'Only managers can reject at step 1.'},
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
        """Get all tasks pending approval."""
        tasks = self.get_queryset().filter(status='in_review')
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
