from rest_framework import serializers
from .models import Task
from ..users.models import CustomUser
from ..users.serializers import UserSerializer

ROLE_LABEL = {0: 'Superadmin', 1: 'Team Leader', 2: 'Senior Dev', 3: 'Junior Dev', 4: 'Intern'}


class TicketSerializer(serializers.ModelSerializer):
    """Full ticket detail serializer."""
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), write_only=True,
        required=False, allow_null=True, source='assigned_to'
    )
    current_approver_role = serializers.SerializerMethodField()
    pipeline = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'ticket_number', 'title', 'description', 'priority',
            'created_by', 'assigned_to', 'assigned_to_id',
            'status', 'current_approver_level', 'current_approver_role',
            'pipeline', 'approval_step', 'created_at', 'updated_at',
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
        """Returns pipeline stages showing which levels have been cleared."""
        creator_level = obj.created_by.role_level if obj.created_by else 4
        stages = []
        for level in range(creator_level - 1, -1, -1):
            if obj.status == 'closed':
                done = True
            elif obj.status == 'rejected':
                done = level > obj.current_approver_level
            else:
                done = level > obj.current_approver_level
            stages.append({
                'level': level,
                'role': ROLE_LABEL.get(level, 'Unknown'),
                'done': done,
                'current': obj.status not in ('closed', 'rejected') and level == obj.current_approver_level,
            })
        return stages

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        # Set initial approver level: one step above creator
        creator_level = user.role_level
        if creator_level > 0:
            validated_data['current_approver_level'] = creator_level - 1
        else:
            # Superadmin tickets are auto-closed
            validated_data['status'] = 'closed'
            validated_data['current_approver_level'] = -1
        return super().create(validated_data)


class TicketListSerializer(serializers.ModelSerializer):
    """Lightweight list serializer."""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    assigned_to = serializers.PrimaryKeyRelatedField(read_only=True)
    current_approver_role = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'ticket_number', 'title', 'description', 'priority',
            'created_by_username', 'created_by_name',
            'assigned_to', 'assigned_to_username',
            'status', 'current_approver_level', 'current_approver_role',
            'approval_step', 'created_at',
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


# Back-compat aliases
TaskSerializer = TicketSerializer
TaskListSerializer = TicketListSerializer
