from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Task(models.Model):
    """
    Task model for 2-step approval workflow.
    
    A task represents a unit of work that goes through an approval process:
    - Created by a user in "in_review" status
    - Manager approves/rejects at step 1
    - Admin approves/rejects at step 2
    - Final status can be "approved" or "rejected"
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    title = models.CharField(
        max_length=255,
        help_text='Task title or subject'
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Detailed task description'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_tasks',
        help_text='User who created this task'
    )
    
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        help_text='User this task is assigned to'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Task status (pending, in_review, approved, rejected)'
    )
    
    approval_step = models.IntegerField(
        default=1,
        help_text='Current approval step (1=Manager, 2=Admin)'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the task was created'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the task was last modified'
    )
    
    class Meta:
        db_table = 'tasks_task'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['created_by']),
        ]
    
    def __str__(self):
        """String representation of task."""
        return f"{self.title} (Step {self.approval_step}, {self.get_status_display()})"
    
    def is_in_approval(self):
        """Check if task is still in approval workflow."""
        return self.status == 'in_review'
    
    def is_completed(self):
        """Check if task has completed (approved or rejected)."""
        return self.status in ['approved', 'rejected']
