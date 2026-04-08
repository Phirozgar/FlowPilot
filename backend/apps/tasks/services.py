"""
Ticket approval pipeline service.

Pipeline: creator_level - 1 -> ... -> 0 (superadmin)
A user can approve a ticket if their role_level <= ticket.current_approver_level
(i.e. they are at or senior to the current required approver level).
"""

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from .models import Task


def _initial_approver_level(creator_role_level):
    """The first person who must approve is one level above the creator."""
    return creator_role_level - 1


class TicketPipelineService:

    @staticmethod
    def can_approve(user, ticket):
        """
        A user can approve a ticket if:
          - The ticket is open or in_review
          - Their role_level <= ticket.current_approver_level
            (they are senior enough to approve at this stage)
          - They did not create the ticket themselves
        """
        if ticket.status in ('closed', 'rejected'):
            return False, "This ticket is already resolved."
        if ticket.created_by_id == user.id:
            return False, "You cannot approve your own ticket."
        if user.role_level > ticket.current_approver_level:
            return False, "You are not senior enough to approve at this stage."
        return True, None

    @staticmethod
    @transaction.atomic
    def approve(ticket, user):
        ok, reason = TicketPipelineService.can_approve(user, ticket)
        if not ok:
            return {'status': 'error', 'message': reason, 'code': status.HTTP_403_FORBIDDEN}

        # Move the required approver level one step higher (lower number)
        next_level = ticket.current_approver_level - 1

        if next_level < 0:
            # Reached the top — ticket is fully approved and closed
            ticket.status = 'closed'
        else:
            ticket.status = 'in_review'
            ticket.current_approver_level = next_level

        ticket.save(update_fields=['status', 'current_approver_level', 'updated_at'])
        return {'status': 'success', 'message': 'Ticket approved and moved up the pipeline.', 'ticket': ticket, 'code': status.HTTP_200_OK}

    @staticmethod
    @transaction.atomic
    def reject(ticket, user):
        ok, reason = TicketPipelineService.can_approve(user, ticket)
        if not ok:
            return {'status': 'error', 'message': reason, 'code': status.HTTP_403_FORBIDDEN}

        ticket.status = 'rejected'
        ticket.save(update_fields=['status', 'updated_at'])
        return {'status': 'success', 'message': 'Ticket rejected.', 'ticket': ticket, 'code': status.HTTP_200_OK}

    @staticmethod
    @transaction.atomic
    def close(ticket, user):
        """Directly close a ticket (team_leader+ only)."""
        if not user.is_leader():
            return {'status': 'error', 'message': 'Only team leaders or above can close tickets directly.', 'code': status.HTTP_403_FORBIDDEN}
        ticket.status = 'closed'
        ticket.save(update_fields=['status', 'updated_at'])
        return {'status': 'success', 'message': 'Ticket closed.', 'ticket': ticket, 'code': status.HTTP_200_OK}

    @staticmethod
    @transaction.atomic
    def reopen(ticket, user):
        """Reopen a closed/rejected ticket."""
        if ticket.created_by_id != user.id and not user.is_leader():
            return {'status': 'error', 'message': 'Only the creator or a team leader can reopen tickets.', 'code': status.HTTP_403_FORBIDDEN}
        ticket.status = 'open'
        creator_level = ticket.created_by.role_level
        ticket.current_approver_level = _initial_approver_level(creator_level) if creator_level > 0 else 0
        ticket.save(update_fields=['status', 'current_approver_level', 'updated_at'])
        return {'status': 'success', 'message': 'Ticket reopened.', 'ticket': ticket, 'code': status.HTTP_200_OK}


# Keep old names as aliases so nothing breaks
class TaskApprovalService:
    approve_task = staticmethod(lambda task, user: TicketPipelineService.approve(task, user))
    reject_task = staticmethod(lambda task, user: TicketPipelineService.reject(task, user))


class TaskQueryService:
    @staticmethod
    def get_user_visible_tasks(user):
        if user.is_superadmin():
            return Task.objects.all()
        if user.is_leader():
            if user.team:
                return Task.objects.filter(
                    Q(created_by__team=user.team) | Q(assigned_to__team=user.team)
                ).distinct()
            return Task.objects.all()
        return Task.objects.filter(Q(created_by=user) | Q(assigned_to=user))

    @staticmethod
    def get_dashboard_stats(user):
        visible = TaskQueryService.get_user_visible_tasks(user)
        mine_to_approve = visible.filter(
            status__in=['open', 'in_review'],
            current_approver_level=user.role_level
        ).exclude(created_by=user)
        return {
            'total_tasks': visible.count(),
            'tasks_created_by_user': visible.filter(created_by=user).count(),
            'tasks_assigned_to_user': visible.filter(assigned_to=user).count(),
            'pending_tasks': mine_to_approve.count(),
            'approved_tasks': visible.filter(status='closed').count(),
            'rejected_tasks': visible.filter(status='rejected').count(),
        }
