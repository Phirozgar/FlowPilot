from rest_framework import serializers
from .models import Task
from apps.users.models import CustomUser
from apps.users.serializers import UserSerializer


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for task data with approval workflow."""
    
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        source='assigned_to'
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
    """Lightweight serializer for listing tasks."""
    
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    
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
