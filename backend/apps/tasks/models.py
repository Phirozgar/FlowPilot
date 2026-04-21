"""
Task/Ticket models with hierarchical approval pipeline and audit log.
"""
import random
import string
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


def generate_ticket_number():
    """Generate a unique ticket number like TKT-A3F2B1."""
    return 'TKT-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


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
            # Ensure uniqueness — retry up to 10 times
            for _ in range(10):
                candidate = generate_ticket_number()
                if not Task.objects.filter(ticket_number=candidate).exists():
                    self.ticket_number = candidate
                    break
            else:
                # Fallback: use uuid-based number
                import uuid
                self.ticket_number = 'TKT-' + uuid.uuid4().hex[:6].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_number}: {self.title} [{self.get_status_display()}]"

    def is_open(self):
        return self.status == 'open'

    def is_closed(self):
        return self.status in ['closed', 'rejected']


class TicketLog(models.Model):
    """
    Immutable audit log for every action taken on a ticket.
    Records who did what, when, and any relevant note.
    """

    ACTION_CHOICES = [
        ('created', 'Created'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('closed', 'Closed'),
        ('reopened', 'Reopened'),
        ('edited', 'Edited'),
        ('comment', 'Comment'),
    ]

    ticket = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='logs')
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='ticket_actions'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    note = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tasks_ticketlog'
        ordering = ['timestamp']

    def __str__(self):
        actor_name = self.actor.username if self.actor else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor_name} {self.action} {self.ticket.ticket_number}"
