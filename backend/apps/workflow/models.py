from django.db import models
from django.contrib.auth import get_user_model
from apps.tasks.models import Task

User = get_user_model()

class WorkflowTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.name

class WorkflowStep(models.Model):
    workflow = models.ForeignKey(WorkflowTemplate, related_name='steps', on_delete=models.CASCADE)
    step_order = models.IntegerField()
    name = models.CharField(max_length=255)
    # Required role identifier (or ForeignKey to a UserRole model if applicable)
    required_role = models.CharField(max_length=100, help_text="Simplified role check")
    
    class Meta:
        ordering = ['step_order']

    def __str__(self):
        return f"{self.workflow.name} - Step {self.step_order}: {self.name}"

class WorkflowInstance(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    ]
    workflow = models.ForeignKey(WorkflowTemplate, on_delete=models.PROTECT)
    task = models.OneToOneField(Task, on_delete=models.CASCADE, related_name='workflow_instance')
    current_step = models.ForeignKey(WorkflowStep, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

class WorkflowAction(models.Model):
    ACTION_CHOICES = [
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('MODIFY', 'Modify'),
    ]
    instance = models.ForeignKey(WorkflowInstance, related_name='actions', on_delete=models.CASCADE)
    step = models.ForeignKey(WorkflowStep, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    comments = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
