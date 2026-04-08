from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class Team(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    organization = models.CharField(max_length=255, default='FlowPilot Inc')

    def __str__(self):
        return self.name

ROLE_LEVELS = {
    'superadmin': 0,
    'team_leader': 1,
    'senior_dev': 2,
    'junior_dev': 3,
    'intern': 4,
}

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('superadmin', 'Superadmin'),
        ('team_leader', 'Team Leader'),
        ('senior_dev', 'Senior Developer'),
        ('junior_dev', 'Junior Developer'),
        ('intern', 'Intern'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='intern',
        help_text='User role for permission management'
    )
    # Primary (active) team
    team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name='members')

    class Meta:
        db_table = 'users_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def is_superadmin(self):
        return self.role.lower() == 'superadmin' or self.is_superuser

    def is_leader(self):
        return self.role.lower() in ['superadmin', 'team_leader'] or self.is_superuser

    @property
    def role_level(self):
        if self.is_superuser:
            return 0
        return ROLE_LEVELS.get(self.role.lower(), 5)


class UserTeamMembership(models.Model):
    """Tracks all teams a user belongs to and their role in each."""
    ROLE_CHOICES = [
        ('superadmin', 'Superadmin'),
        ('team_leader', 'Team Leader'),
        ('senior_dev', 'Senior Developer'),
        ('junior_dev', 'Junior Developer'),
        ('intern', 'Intern'),
    ]
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='team_memberships')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='intern')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'team')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.team.name} as {self.role}"
