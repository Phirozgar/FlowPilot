"""
Task management views with 2-step approval workflow.

Handles task CRUD operations, filtering, pagination, and approval workflow.
Uses service layer for business logic and custom permissions.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from .models import Task
from .serializers import TaskSerializer, TaskListSerializer, DashboardSerializer
from .services import TaskApprovalService, TaskQueryService
from .permissions import IsRegularUser


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for task management with 2-step approval workflow.
    
    Endpoints:
    - List/Create tasks: /api/tasks/
    - Retrieve/Update/Delete: /api/tasks/{id}/
    - Approve task: /api/tasks/{id}/approve/
    - Reject task: /api/tasks/{id}/reject/
    - Dashboard stats: /api/tasks/dashboard/
    - Pending approval: /api/tasks/pending_approval/
    - My tasks: /api/tasks/my_tasks/
    - Created by me: /api/tasks/created_by_me/
    
    Permissions:
    - Only users can create tasks
    - Managers can approve at step 1
    - Admins can approve at step 2
    """
    
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'status', 'approval_step']
    ordering = ['-created_at']  # Default: newest first
    
    def get_queryset(self):
        """
        Get tasks visible to current user, with optional filtering.
        
        Role-based visibility:
        - Managers/Admins: see all tasks
        - Users: see only their own tasks (created or assigned)
        
        Supports query parameters for filtering:
        - status: task status
        - assigned_to: user ID or username
        - created_by: user ID or username
        - approval_step: approval step number
        """
        user = self.request.user
        queryset = TaskQueryService.get_user_visible_tasks(user)
        
        # Apply query parameter filters
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        assigned_to_param = self.request.query_params.get('assigned_to')
        if assigned_to_param:
            queryset = queryset.filter(
                Q(assigned_to__id=assigned_to_param) | 
                Q(assigned_to__username=assigned_to_param)
            )
        
        created_by_param = self.request.query_params.get('created_by')
        if created_by_param:
            queryset = queryset.filter(
                Q(created_by__id=created_by_param) | 
                Q(created_by__username=created_by_param)
            )
        
        approval_step_param = self.request.query_params.get('approval_step')
        if approval_step_param:
            queryset = queryset.filter(approval_step=approval_step_param)
        
        return queryset
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return TaskListSerializer
        return TaskSerializer
    
    def perform_create(self, serializer):
        """Create task with logged-in user as creator."""
        serializer.save(created_by=self.request.user, status='in_review')
    
    def create(self, request, *args, **kwargs):
        """Create task. Only regular users can create tasks."""
        if not request.user.is_regular_user():
            return Response(
                {'detail': 'Only regular users can create tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """Approve task using approval workflow service."""
        task = self.get_object()
        result = TaskApprovalService.approve_task(task, request.user)
        
        if result['status'] == 'error':
            return Response(
                {'detail': result['message']},
                status=result['code']
            )
        
        return Response(
            {
                'detail': result['message'],
                'task': TaskSerializer(result['task'], context={'request': request}).data
            },
            status=result['code']
        )
    
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """Reject task using approval workflow service."""
        task = self.get_object()
        result = TaskApprovalService.reject_task(task, request.user)
        
        if result['status'] == 'error':
            return Response(
                {'detail': result['message']},
                status=result['code']
            )
        
        return Response(
            {
                'detail': result['message'],
                'task': TaskSerializer(result['task'], context={'request': request}).data
            },
            status=result['code']
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
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get dashboard statistics for the logged-in user."""
        stats = TaskQueryService.get_dashboard_stats(request.user)
        serializer = DashboardSerializer(stats)
        return Response(serializer.data)
