"""
User, Team, and Membership models for FlowPilot.
"""
import random
import re
import string
from django.db import models
from django.contrib.auth.models import AbstractUser


def _generate_team_code():
    """
    Generate a team invite code in the format ABC-123
    (3 uppercase letters, dash, 3 digits).
    Example: ZQX-847
    """
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    digits = ''.join(random.choices(string.digits, k=3))
    return f"{letters}-{digits}"


def generate_unique_team_code():
    """Generate a team code guaranteed to be unique in the DB."""
    for _ in range(20):
        candidate = _generate_team_code()
        if not Team.objects.filter(code=candidate).exists():
            return candidate
    # Extremely unlikely fallback: extend to 4 digits
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    digits = ''.join(random.choices(string.digits, k=4))
    return f"{letters}-{digits}"


class Team(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, unique=True, blank=True)
    organization = models.CharField(max_length=255, default='FlowPilot Inc')

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_unique_team_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.code}]"


ROLE_LEVELS = {
    'superadmin': 0,
    'team_leader': 1,
    'senior_dev': 2,
    'junior_dev': 3,
    'intern': 4,
}

ROLE_CHOICES = [
    ('superadmin', 'Superadmin'),
    ('team_leader', 'Team Leader'),
    ('senior_dev', 'Senior Developer'),
    ('junior_dev', 'Junior Developer'),
    ('intern', 'Intern'),
]


class CustomUser(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='intern',
        help_text='User role for permission management',
    )
    # Primary (active) team
    team = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name='members'
    )

    class Meta:
        db_table = 'users_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.get_display_role()})"

    def get_display_role(self):
        """Return human-readable role, treating superusers as superadmin."""
        if self.is_superuser:
            return 'Superadmin'
        return dict(ROLE_CHOICES).get(self.role, self.role)

    def is_superadmin(self):
        return self.role == 'superadmin' or self.is_superuser

    def is_leader(self):
        return self.role in ['superadmin', 'team_leader'] or self.is_superuser

    def can_create_team(self):
        """Superadmin, Team Leader, and Senior Dev can create teams."""
        return self.role in ['superadmin', 'team_leader', 'senior_dev'] or self.is_superuser

    @property
    def role_level(self):
        if self.is_superuser:
            return 0
        return ROLE_LEVELS.get(self.role, 5)

    @property
    def effective_role(self):
        """Return 'superadmin' if superuser, otherwise self.role."""
        if self.is_superuser and self.role not in ('superadmin',):
            return 'superadmin'
        return self.role


class UserTeamMembership(models.Model):
    """Tracks all teams a user belongs to and their role in each team."""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='team_memberships')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='intern')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'team')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.team.name} as {self.role}"


class TeamJoinRequest(models.Model):
    """Pending join requests that a team_leader/superadmin must approve."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='join_requests'
    )
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name='join_requests'
    )
    requested_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='intern')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        CustomUser, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reviewed_join_requests',
    )
    message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Removed unique_together involving status so users can re-apply after rejection.
        # Uniqueness of pending requests is enforced at the view layer.
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} → {self.team.name} ({self.status})"
