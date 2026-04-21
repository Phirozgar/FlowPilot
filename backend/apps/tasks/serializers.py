"""
Task serializers — hierarchical approval pipeline with audit log.

Pipeline display order (left to right):
  Intern (creator) → Junior Dev → Senior Dev → Team Leader → Superadmin
  i.e., first approver leftmost (closest to creator), Superadmin rightmost (last).

Issue 6 — "Direct" workflow:
  When `direct=True` is sent at ticket creation, the ticket bypasses all
  intermediate approvers and goes straight to the team_leader (level 1).
  This field is write-only and not persisted on the model; it only affects
  the initial `current_approver_level` set at creation time.
"""

import logging
from rest_framework import serializers
from .models import Task, TicketLog
from ..users.models import CustomUser
from ..users.serializers import UserSerializer

logger = logging.getLogger(__name__)

ROLE_LABEL = {0: 'Superadmin', 1: 'Team Leader', 2: 'Senior Dev', 3: 'Junior Dev', 4: 'Intern'}
TEAM_LEADER_LEVEL = 1


class TicketLogSerializer(serializers.ModelSerializer):
    """Immutable audit trail entry for a ticket."""
    actor_username = serializers.CharField(source='actor.username', read_only=True, allow_null=True)
    actor_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = TicketLog
        fields = ['id', 'action', 'action_display', 'actor_username', 'actor_name', 'note', 'timestamp']
        read_only_fields = fields

    def get_actor_name(self, obj):
        if not obj.actor:
            return 'System'
        u = obj.actor
        return f"{u.first_name} {u.last_name}".strip() or u.username


class TicketSerializer(serializers.ModelSerializer):
    """Full ticket detail serializer."""

    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)

    # Write-only: set assigned_to by user ID
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        source='assigned_to',
    )

    # Issue 6: write-only flag — when True, skip all intermediate approvals
    # and send the ticket directly to the team_leader (level 1).
    direct = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
        help_text='If True, ticket skips all intermediate approvals and goes directly to Team Leader.',
    )

    current_approver_role = serializers.SerializerMethodField()
    pipeline = serializers.SerializerMethodField()
    logs = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'ticket_number', 'title', 'description', 'priority',
            'created_by', 'assigned_to', 'assigned_to_id', 'direct',
            'status', 'current_approver_level', 'current_approver_role',
            'pipeline', 'approval_step', 'created_at', 'updated_at',
            'logs', 'can_delete',
        ]
        read_only_fields = [
            'id', 'ticket_number', 'created_by', 'current_approver_level',
            'approval_step', 'created_at', 'updated_at',
        ]

    def get_current_approver_role(self, obj):
        if obj.status in ('closed', 'rejected'):
            return None
        return ROLE_LABEL.get(obj.current_approver_level, 'Unknown')

    def get_pipeline(self, obj):
        """
        Returns pipeline stages in LEFT-TO-RIGHT chronological order.

        For an Intern (level 4):
          range(3, -1, -1) = [3, 2, 1, 0]
          → Junior Dev → Senior Dev → Team Leader → Superadmin  ✓

        For a "direct" ticket from an Intern (current_approver_level forced to 1):
          range(3, -1, -1) = [3, 2, 1, 0] — showed but 3 and 2 are already marked 'done'
          since done = level > current_approver_level (1)
          → Junior Dev (done) → Senior Dev (done) → Team Leader (current) → Superadmin
        """
        creator_level = obj.created_by.role_level if obj.created_by else 4
        stages = []

        for level in range(creator_level - 1, -1, -1):
            if obj.status == 'closed':
                done = True
                current = False
            elif obj.status == 'rejected':
                done = level > obj.current_approver_level
                current = False
            else:
                done = level > obj.current_approver_level
                current = level == obj.current_approver_level

            stages.append({
                'level': level,
                'role': ROLE_LABEL.get(level, 'Unknown'),
                'done': done,
                'current': current,
            })

        return stages

    def get_logs(self, obj):
        return TicketLogSerializer(obj.logs.all(), many=True).data

    def get_can_delete(self, obj):
        """Expose whether the current user can delete this ticket (for UI)."""
        request = self.context.get('request')
        if not request:
            return False
        from .services import TicketPipelineService
        can, _ = TicketPipelineService.can_delete(obj, request.user)
        return can

    def create(self, validated_data):
        # Pop the write-only `direct` flag before saving
        is_direct = validated_data.pop('direct', False)

        user = self.context['request'].user

        if not user.team and not user.is_superadmin():
            raise serializers.ValidationError(
                {'non_field_errors': ['You must be part of a team to create tickets.']}
            )

        validated_data['created_by'] = user

        creator_level = user.role_level

        if creator_level > 0:
            if is_direct:
                # Issue 6: Direct workflow — bypass all intermediate approvers,
                # send straight to team_leader (level 1).
                # If creator is already team_leader or above, fall back to standard.
                direct_level = min(TEAM_LEADER_LEVEL, creator_level - 1)
                validated_data['current_approver_level'] = direct_level
            else:
                # Standard: go to the next level up
                validated_data['current_approver_level'] = creator_level - 1
        else:
            # Superadmin: auto-close, no one above to approve
            validated_data['status'] = 'closed'
            validated_data['current_approver_level'] = -1

        ticket = super().create(validated_data)

        # Audit log entry
        from .services import _log
        _log(
            ticket, user, 'created',
            f'Ticket created by {user.username}'
            + (' (direct-to-leader routing).' if is_direct else '.'),
        )

        # Auto-create ticket chat channel (non-fatal)
        try:
            self._create_ticket_channel(ticket, user)
        except Exception as e:
            logger.error('Ticket channel creation failed for %s: %s', ticket.ticket_number, e)

        return ticket

    def update(self, instance, validated_data):
        # Discard `direct` on update — it only applies at creation
        validated_data.pop('direct', None)

        user = self.context['request'].user
        ticket = super().update(instance, validated_data)
        from .services import _log
        _log(ticket, user, 'edited', f'Edited by {user.username}.')
        return ticket

    def _create_ticket_channel(self, ticket, creator):
        """Create a dedicated chat channel for this ticket."""
        from apps.communication.models import Channel
        channel_name = f'Ticket #{ticket.ticket_number}: {ticket.title[:40]}'
        channel = Channel.objects.create(name=channel_name, channel_type='task')
        channel.members.add(creator)
        if ticket.assigned_to:
            channel.members.add(ticket.assigned_to)
        return channel


class TicketListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    assigned_to_username = serializers.CharField(
        source='assigned_to.username', read_only=True, allow_null=True
    )
    assigned_to = serializers.PrimaryKeyRelatedField(read_only=True)
    current_approver_role = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'ticket_number', 'title', 'description', 'priority',
            'created_by_username', 'created_by_name',
            'assigned_to', 'assigned_to_username',
            'status', 'current_approver_level', 'current_approver_role',
            'approval_step', 'created_at', 'can_delete',
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        u = obj.created_by
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_current_approver_role(self, obj):
        if obj.status in ('closed', 'rejected'):
            return None
        return ROLE_LABEL.get(obj.current_approver_level, 'Unknown')

    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        from .services import TicketPipelineService
        can, _ = TicketPipelineService.can_delete(obj, request.user)
        return can


# Back-compat aliases
TaskSerializer = TicketSerializer
TaskListSerializer = TicketListSerializer
