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
    """
    Extended User model with role-based access control.
    
    Roles:
    - admin: Full access to all operations
    - manager: Can review and approve tasks at step 1
    - user: Can create tasks, view own tasks
    """
    
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
    team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name='members')
    
    class Meta:
        db_table = 'users_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        """String representation of user with role."""
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
