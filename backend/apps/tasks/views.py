from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Task
from .serializers import TaskSerializer, TaskListSerializer
from utils.permissions import (
    IsTaskCreatorOrAssigned,
    CanAssignTask,
    IsAdminOrManager,
)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for task management.
    Provides list, create, retrieve, update, delete operations with role-based permissions.
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
        
        # Regular users: see their own created or assigned tasks
        return Task.objects.filter(
            Q(created_by=user) | Q(assigned_to=user)
        )
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return TaskListSerializer
        return TaskSerializer
    
    def perform_create(self, serializer):
        """Create task with current user as creator."""
        serializer.save(created_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Delete task (only creator or admin can delete)."""
        task = self.get_object()
        if task.created_by != request.user and not request.user.is_admin():
            return Response(
                {'detail': 'You can only delete your own tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Update task with permission checks.
        Only creator or managers can update.
        """
        task = self.get_object()
        if task.created_by != request.user and not request.user.is_manager():
            return Response(
                {'detail': 'You can only update your own tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, CanAssignTask])
    def assign(self, request, pk=None):
        """Assign task to a user (managers and admins only)."""
        task = self.get_object()
        assigned_to_id = request.data.get('assigned_to_id')
        
        if not assigned_to_id:
            return Response(
                {'error': 'assigned_to_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.users.models import CustomUser
            user = CustomUser.objects.get(id=assigned_to_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not task.can_be_assigned():
            return Response(
                {'error': f'Task cannot be assigned when in {task.get_status_display()} status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.assigned_to = user
        task.save()
        
        serializer = TaskSerializer(task, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['patch'])
    def change_status(self, request, pk=None):
        """
        Change task status.
        Users can only change status of tasks they're assigned to or created.
        """
        task = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if status is valid
        valid_statuses = [choice[0] for choice in Task.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Choose from: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Permission check: only creator, assigned user, or manager can change status
        if (task.created_by != request.user and 
            task.assigned_to != request.user and 
            not request.user.is_manager()):
            return Response(
                {'detail': 'You do not have permission to change this task status.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task.status = new_status
        task.save()
        
        serializer = TaskSerializer(task, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Filter tasks by status."""
        status_filter = request.query_params.get('status')
        if not status_filter:
            return Response(
                {'error': 'status parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tasks = self.get_queryset().filter(status=status_filter)
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_priority(self, request):
        """Filter tasks by priority."""
        priority = request.query_params.get('priority')
        if not priority:
            return Response(
                {'error': 'priority parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tasks = self.get_queryset().filter(priority=priority)
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
