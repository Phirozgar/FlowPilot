from rest_framework import serializers
from .models import WorkflowTemplate, WorkflowStep, WorkflowInstance, WorkflowAction
from apps.tasks.serializers import TaskListSerializer
from apps.tasks.models import Task

class WorkflowStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowStep
        fields = '__all__'

class WorkflowTemplateSerializer(serializers.ModelSerializer):
    steps = WorkflowStepSerializer(many=True, read_only=True)

    class Meta:
        model = WorkflowTemplate
        fields = '__all__'

class WorkflowInstanceSerializer(serializers.ModelSerializer):
    workflow = WorkflowTemplateSerializer(read_only=True)
    current_step = WorkflowStepSerializer(read_only=True)
    task_details = TaskListSerializer(source='task', read_only=True)
    
    # IDs for write operations
    workflow_id = serializers.PrimaryKeyRelatedField(
        queryset=WorkflowTemplate.objects.all(), source='workflow', write_only=True
    )
    task_id = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(), source='task', write_only=True
    )

    class Meta:
        model = WorkflowInstance
        fields = ['id', 'workflow', 'current_step', 'task_details', 'status', 'created_at', 'workflow_id', 'task_id']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        # Automatically set current_step to the first step of the workflow
        workflow = validated_data.get('workflow')
        instance = WorkflowInstance.objects.create(**validated_data)
        if workflow and workflow.steps.exists():
            instance.current_step = workflow.steps.all().first()
            instance.status = 'ACTIVE'
            instance.save()
        return instance

class WorkflowActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowAction
        fields = '__all__'
