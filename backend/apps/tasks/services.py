"""
Business logic service for task approval workflow.

Separates approval logic from views to improve maintainability.
Handles 2-step approval workflow and validation.
"""

from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from .models import Task


class TaskApprovalService:
    """
    Service class for task approval workflow.
    
    Handles:
    - Step 1: Manager approval (move to step 2)
    - Step 2: Admin approval (set status to approved)
    - Rejection at any step (set status to rejected)
    - Permission validation
    """
    
    @staticmethod
    def can_approve_at_step_1(user):
        """Check if user can approve tasks at step 1 (Manager approval)."""
        return user.is_manager() and not user.is_regular_user()
    
    @staticmethod
    def can_approve_at_step_2(user):
        """Check if user can approve tasks at step 2 (Admin approval)."""
        return user.is_admin()
    
    @staticmethod
    def can_reject(user, step):
        """Check if user can reject task at given step."""
        if step == 1:
            return user.is_manager() and not user.is_regular_user()
        elif step == 2:
            return user.is_admin()
        return False
    
    @staticmethod
    @transaction.atomic
    def approve_task(task, user):
        """
        Approve task based on current approval step.
        
        Args:
            task: Task instance to approve
            user: User performing the approval
            
        Returns:
            dict: Contains 'status' (success/error) and 'task' data
        """
        if task.approval_step == 1:
            # Step 1: Manager approval - move to step 2
            if not TaskApprovalService.can_approve_at_step_1(user):
                return {
                    'status': 'error',
                    'message': 'Only managers can approve at step 1.',
                    'code': status.HTTP_403_FORBIDDEN
                }
            
            task.approval_step = 2
            task.save(update_fields=['approval_step', 'updated_at'])
            return {
                'status': 'success',
                'message': 'Task approved by manager. Moved to step 2 (Admin review).',
                'task': task,
                'code': status.HTTP_200_OK
            }
        
        elif task.approval_step == 2:
            # Step 2: Admin approval - set status to approved
            if not TaskApprovalService.can_approve_at_step_2(user):
                return {
                    'status': 'error',
                    'message': 'Only admins can approve at step 2.',
                    'code': status.HTTP_403_FORBIDDEN
                }
            
            task.status = 'approved'
            task.save(update_fields=['status', 'updated_at'])
            return {
                'status': 'success',
                'message': 'Task approved by admin. Status set to Approved.',
                'task': task,
                'code': status.HTTP_200_OK
            }
        
        return {
            'status': 'error',
            'message': 'Task cannot be approved at this step.',
            'code': status.HTTP_400_BAD_REQUEST
        }
    
    @staticmethod
    @transaction.atomic
    def reject_task(task, user):
        """
        Reject task at any step.
        
        Args:
            task: Task instance to reject
            user: User performing the rejection
            
        Returns:
            dict: Contains 'status' (success/error) and 'task' data
        """
        if not TaskApprovalService.can_reject(user, task.approval_step):
            message = f'Only {"managers" if task.approval_step == 1 else "admins"} can reject at step {task.approval_step}.'
            return {
                'status': 'error',
                'message': message,
                'code': status.HTTP_403_FORBIDDEN
            }
        
        task.status = 'rejected'
        task.save(update_fields=['status', 'updated_at'])
        return {
            'status': 'success',
            'message': f'Task rejected by {"manager" if task.approval_step == 1 else "admin"}.',
            'task': task,
            'code': status.HTTP_200_OK
        }


class TaskQueryService:
    """
    Service class for task queries and filtering.
    
    Handles role-based task visibility and filtering.
    """
    
    @staticmethod
    def get_user_visible_tasks(user):
        """
        Get tasks visible to user based on role.
        
        Args:
            user: User instance
            
        Returns:
            QuerySet: Tasks visible to user
        """
        from django.db.models import Q
        
        if user.is_manager():
            # Managers and admins see all tasks
            return Task.objects.all()
        
        # Regular users see only tasks they created or are assigned to
        return Task.objects.filter(
            Q(created_by=user) | Q(assigned_to=user)
        )
    
    @staticmethod
    def get_dashboard_stats(user):
        """
        Get dashboard statistics for user.
        
        Args:
            user: User instance
            
        Returns:
            dict: Dashboard statistics
        """
        from django.db.models import Count
        
        visible_tasks = TaskQueryService.get_user_visible_tasks(user)
        
        return {
            'total_tasks': visible_tasks.count(),
            'tasks_created_by_user': visible_tasks.filter(created_by=user).count(),
            'tasks_assigned_to_user': visible_tasks.filter(assigned_to=user).count(),
            'pending_tasks': visible_tasks.filter(status='in_review').count(),
            'approved_tasks': visible_tasks.filter(status='approved').count(),
            'rejected_tasks': visible_tasks.filter(status='rejected').count(),
        }
