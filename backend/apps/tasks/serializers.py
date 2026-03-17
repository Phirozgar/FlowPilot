"""
Serializers for task management API.

Handles serialization and deserialization of task data with validation.
"""

from rest_framework import serializers
from .models import Task
from ..users.models import CustomUser
from ..users.serializers import UserSerializer


class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed task data with full user information.
    
    Used for retrieve and detail views where full user info is needed.
    """
    
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        source='assigned_to',
        help_text='User ID to assign task to'
    )
    
    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'created_by',
            'assigned_to',
            'assigned_to_id',
            'status',
            'approval_step',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'approval_step']
    
    def create(self, validated_data):
        """Create task with current user as creator."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing tasks.
    
    Returns only essential fields to reduce payload size and improve performance.
    """
    
    created_by_username = serializers.CharField(
        source='created_by.username',
        read_only=True,
        help_text='Username of task creator'
    )
    assigned_to_username = serializers.CharField(
        source='assigned_to.username',
        read_only=True,
        allow_null=True,
        help_text='Username of assigned user'
    )
    
    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'created_by_username',
            'assigned_to_username',
            'status',
            'approval_step',
            'created_at',
        ]


class DashboardSerializer(serializers.Serializer):
    """
    Serializer for dashboard statistics.
    
    Aggregates task statistics for dashboard display.
    """
    
    total_tasks = serializers.IntegerField(
        help_text="Total number of tasks visible to user"
    )
    tasks_created_by_user = serializers.IntegerField(
        help_text="Tasks created by the user"
    )
    tasks_assigned_to_user = serializers.IntegerField(
        help_text="Tasks assigned to the user"
    )
    pending_tasks = serializers.IntegerField(
        help_text="Tasks with status 'in_review'"
    )
    approved_tasks = serializers.IntegerField(
        help_text="Tasks with status 'approved'"
    )
    rejected_tasks = serializers.IntegerField(
        help_text="Tasks with status 'rejected'"
    )
