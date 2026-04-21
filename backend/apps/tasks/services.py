"""
Ticket visibility and pipeline services.

Visibility rules (Issue 9):
  - All queries are scoped to teams the user is currently a MEMBER of.
  - When a user leaves a team, their UserTeamMembership is removed, so
    tickets from that team are no longer visible to them.
  - When they rejoin (approved again), the membership is restored and
    all data comes back automatically (Issue 10 - preserved intentionally).

Pipeline rules:
  - creator_level - 1 = first approver level
  - Levels decrement down to 0 (superadmin)

Delete rules (Issue 8):
  - Ticket creator can delete if the ticket has NOT been approved by anyone yet
    i.e. current_approver_level == (creator_level - 1)  AND  status == 'open'
"""

import logging
from django.db import transaction
from django.db.models import Q
from rest_framework import status
from .models import Task, TicketLog

logger = logging.getLogger(__name__)

ROLE_LABEL = {0: 'Superadmin', 1: 'Team Leader', 2: 'Senior Dev', 3: 'Junior Dev', 4: 'Intern'}


def _level_to_role(level):
    return ROLE_LABEL.get(level, f'Level {level}')


def _initial_approver_level(creator_role_level):
    """The first person who must approve is one level above the creator."""
    return creator_role_level - 1


def _log(ticket, actor, action, note=''):
    """Safely write an immutable audit log entry. Never raises."""
    try:
        TicketLog.objects.create(ticket=ticket, actor=actor, action=action, note=note)
    except Exception as e:
        logger.error('Failed to write ticket log for %s: %s', ticket.ticket_number, e)


def _get_user_role_level_for_ticket(user, ticket):
    """
    Resolve the user's effective role level in the context of the ticket's team.
    Falls back to user.role_level if no specific membership is found.
    """
    from apps.users.models import UserTeamMembership, ROLE_LEVELS

    base_level = user.role_level  # handles is_superuser → 0

    if ticket.created_by and ticket.created_by.team_id:
        try:
            membership = UserTeamMembership.objects.get(
                user=user,
                team_id=ticket.created_by.team_id,
            )
            membership_level = ROLE_LEVELS.get(membership.role.lower(), 5)
            return min(base_level, membership_level)
        except UserTeamMembership.DoesNotExist:
            pass

    return base_level


class TicketPipelineService:

    @staticmethod
    def can_approve(user, ticket):
        """
        Returns (True, None) if the user can approve/reject this ticket, or
        (False, reason_string) otherwise.
        """
        if ticket.status in ('closed', 'rejected'):
            return False, 'This ticket is already finalised.'
        if ticket.created_by_id == user.id:
            return False, 'You cannot approve your own ticket.'

        effective_level = _get_user_role_level_for_ticket(user, ticket)
        if effective_level > ticket.current_approver_level:
            needed = _level_to_role(ticket.current_approver_level)
            yours = _level_to_role(effective_level)
            return False, (
                f'This ticket requires approval from "{needed}" or higher. '
                f'Your current role is "{yours}".'
            )
        return True, None

    @staticmethod
    @transaction.atomic
    def approve(ticket, user):
        ok, reason = TicketPipelineService.can_approve(user, ticket)
        if not ok:
            return {'status': 'error', 'message': reason, 'code': status.HTTP_403_FORBIDDEN}

        next_level = ticket.current_approver_level - 1
        if next_level < 0:
            ticket.status = 'closed'
            _log(ticket, user, 'approved', f'Final approval by {user.username}.')
            _log(ticket, user, 'closed', 'Auto-closed after reaching final approval.')
        else:
            ticket.status = 'in_review'
            ticket.current_approver_level = next_level
            _log(ticket, user, 'approved',
                 f'Approved by {user.username}; escalated to {_level_to_role(next_level)}.')

        ticket.save(update_fields=['status', 'current_approver_level', 'updated_at'])
        return {
            'status': 'success',
            'message': 'Ticket approved and moved up the pipeline.',
            'ticket': ticket,
            'code': status.HTTP_200_OK,
        }

    @staticmethod
    @transaction.atomic
    def reject(ticket, user):
        ok, reason = TicketPipelineService.can_approve(user, ticket)
        if not ok:
            return {'status': 'error', 'message': reason, 'code': status.HTTP_403_FORBIDDEN}

        ticket.status = 'rejected'
        ticket.save(update_fields=['status', 'updated_at'])
        _log(ticket, user, 'rejected', f'Rejected by {user.username}.')
        return {
            'status': 'success',
            'message': 'Ticket rejected.',
            'ticket': ticket,
            'code': status.HTTP_200_OK,
        }

    @staticmethod
    @transaction.atomic
    def close(ticket, user):
        """Directly close a ticket (team_leader+ only)."""
        if not user.is_leader():
            return {
                'status': 'error',
                'message': 'Only Team Leaders or above can close tickets directly.',
                'code': status.HTTP_403_FORBIDDEN,
            }
        ticket.status = 'closed'
        ticket.save(update_fields=['status', 'updated_at'])
        _log(ticket, user, 'closed', f'Manually closed by {user.username}.')
        return {
            'status': 'success',
            'message': 'Ticket closed.',
            'ticket': ticket,
            'code': status.HTTP_200_OK,
        }

    @staticmethod
    @transaction.atomic
    def reopen(ticket, user):
        """Reopen a closed/rejected ticket (creator or leader only)."""
        if ticket.created_by_id != user.id and not user.is_leader():
            return {
                'status': 'error',
                'message': 'Only the creator or a Team Leader can reopen tickets.',
                'code': status.HTTP_403_FORBIDDEN,
            }
        ticket.status = 'open'
        creator_level = ticket.created_by.role_level if ticket.created_by else 4
        ticket.current_approver_level = (
            _initial_approver_level(creator_level) if creator_level > 0 else 0
        )
        ticket.save(update_fields=['status', 'current_approver_level', 'updated_at'])
        _log(ticket, user, 'reopened', f'Reopened by {user.username}.')
        return {
            'status': 'success',
            'message': 'Ticket reopened.',
            'ticket': ticket,
            'code': status.HTTP_200_OK,
        }

    @staticmethod
    def can_delete(ticket, user):
        """
        Issue 8: Creator can delete their own ticket ONLY if no one has approved it yet.
        "No approval yet" means the ticket is still at the initial approver level
        (i.e., current_approver_level == creator_level - 1) AND status is 'open'.
        Team leaders can always delete tickets in their teams.
        """
        if user.is_leader():
            return True, None
        if ticket.created_by_id != user.id:
            return False, 'You can only delete tickets you created.'
        creator_level = ticket.created_by.role_level if ticket.created_by else 4
        initial_level = creator_level - 1 if creator_level > 0 else 0
        if ticket.status != 'open':
            return False, 'You cannot delete a ticket that is already in review, closed, or rejected.'
        if ticket.current_approver_level != initial_level:
            return False, (
                'This ticket has already been partially approved. '
                'It can no longer be deleted — only rejected by an approver.'
            )
        return True, None


class TaskQueryService:

    @staticmethod
    def get_user_visible_tasks(user):
        """
        Ticket visibility — scoped strictly to teams the user is CURRENTLY a member of.

        Issue 9 fix: Only show tickets from teams the user has an active membership in.
        Issue 10: When user rejoins, their membership is restored, so data reappears naturally.

        Superadmin: all tickets.
        Team Leader: all tickets in teams they are a leader of.
        Others: own tickets + assigned to them + tickets awaiting their approval
                (all scoped to their current team memberships).
        """
        from apps.users.models import UserTeamMembership

        if user.is_superadmin():
            return Task.objects.all()

        # All teams this user is currently a member of
        member_team_ids = list(
            UserTeamMembership.objects.filter(user=user).values_list('team_id', flat=True)
        )

        if not member_team_ids:
            # User has no active team memberships — can't see anything
            return Task.objects.none()

        # Base scope: tickets from their current teams only
        team_scope_q = (
            Q(created_by__team_id__in=member_team_ids) |
            Q(assigned_to__team_id__in=member_team_ids)
        )

        if user.is_leader():
            # Leaders see ALL tickets within their current teams
            return Task.objects.filter(team_scope_q).distinct()

        # Non-leaders only see:
        # (a) Tickets they created (within their teams)
        # (b) Tickets assigned to them (within their teams)
        # (c) Tickets currently awaiting their role's approval (within their teams)
        return Task.objects.filter(
            team_scope_q
        ).filter(
            Q(created_by=user) |
            Q(assigned_to=user) |
            Q(
                status__in=['open', 'in_review'],
                current_approver_level=user.role_level,
            )
        ).distinct()

    @staticmethod
    def get_dashboard_stats(user):
        visible = TaskQueryService.get_user_visible_tasks(user)
        mine_to_approve = visible.filter(
            status__in=['open', 'in_review'],
            current_approver_level=user.role_level,
        ).exclude(created_by=user)
        return {
            'total_tasks': visible.filter(
                Q(created_by=user) | Q(assigned_to=user)
            ).count(),
            'tasks_created_by_user': visible.filter(created_by=user).count(),
            'tasks_assigned_to_user': visible.filter(assigned_to=user).count(),
            'pending_tasks': mine_to_approve.count(),
            'approved_tasks': visible.filter(status='closed').count(),
            'rejected_tasks': visible.filter(status='rejected').count(),
        }
