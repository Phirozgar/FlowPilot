from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


def generate_ticket_number():
    return 'TKT-' + uuid.uuid4().hex[:6].upper()


class Task(models.Model):
    """
    Ticket model with hierarchical approval pipeline.

    A ticket travels up the role hierarchy for approval:
      intern (4) -> junior_dev (3) -> senior_dev (2) -> team_leader (1) -> superadmin (0)
    current_approver_level tracks which role_level must approve next.
    """

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_review', 'In Review'),
        ('closed', 'Closed'),
        ('rejected', 'Rejected'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    ticket_number = models.CharField(max_length=20, unique=True, blank=True)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default='medium'
    )

    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='created_tasks'
    )
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')

    # Tracks which role_level must approve next. Starts at creator's level - 1.
    # When it reaches -1, the ticket is fully approved and closed.
    current_approver_level = models.IntegerField(default=3)

    # Legacy field kept for compatibility
    approval_step = models.IntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks_task'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['created_by']),
        ]

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = generate_ticket_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_number}: {self.title} [{self.get_status_display()}]"

    def is_open(self):
        return self.status == 'open'

    def is_closed(self):
        return self.status in ['closed', 'rejected']
