"""
Business logic service for task approval workflow.
"""

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from .models import Task


class TaskApprovalService:
    @staticmethod
    def can_approve(user, task):
        """A user can approve if their role_level is strictly lower (higher rank) than the task creator."""
        creator_level = task.created_by.role_level if task.created_by else 5
        return user.role_level < creator_level or user.is_superadmin()

    @staticmethod
    @transaction.atomic
    def approve_task(task, user):
        if not TaskApprovalService.can_approve(user, task):
            return {
                'status': 'error',
                'message': 'You do not have permission to approve this task.',
                'code': status.HTTP_403_FORBIDDEN
            }
        task.approval_step = task.approval_step + 1
        task.status = 'approved'
        task.save(update_fields=['approval_step', 'status', 'updated_at'])
        return {
            'status': 'success',
            'message': 'Task approved.',
            'task': task,
            'code': status.HTTP_200_OK
        }

    @staticmethod
    @transaction.atomic
    def reject_task(task, user):
        if not TaskApprovalService.can_approve(user, task):
            return {
                'status': 'error',
                'message': 'You do not have permission to reject this task.',
                'code': status.HTTP_403_FORBIDDEN
            }
        task.status = 'rejected'
        task.save(update_fields=['status', 'updated_at'])
        return {
            'status': 'success',
            'message': 'Task rejected.',
            'task': task,
            'code': status.HTTP_200_OK
        }


class TaskQueryService:
    @staticmethod
    def get_user_visible_tasks(user):
        """
        Tasks visible to a user:
        - Superadmin / team_leader: all tasks in their team (or all if superadmin)
        - Others: tasks they created OR are assigned to
        """
        if user.is_superadmin():
            return Task.objects.all()

        if user.is_leader():
            if user.team:
                return Task.objects.filter(
                    Q(created_by__team=user.team) | Q(assigned_to__team=user.team)
                ).distinct()
            return Task.objects.all()

        # Regular members: own tasks
        return Task.objects.filter(
            Q(created_by=user) | Q(assigned_to=user)
        )

    @staticmethod
    def get_dashboard_stats(user):
        visible_tasks = TaskQueryService.get_user_visible_tasks(user)
        return {
            'total_tasks': visible_tasks.count(),
            'tasks_created_by_user': visible_tasks.filter(created_by=user).count(),
            'tasks_assigned_to_user': visible_tasks.filter(assigned_to=user).count(),
            'pending_tasks': visible_tasks.filter(status='pending').count(),
            'approved_tasks': visible_tasks.filter(status='approved').count(),
            'rejected_tasks': visible_tasks.filter(status='rejected').count(),
        }
