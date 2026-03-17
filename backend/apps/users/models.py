from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    """
    Extended User model with role-based access control.
    
    Roles:
    - admin: Full access to all operations
    - manager: Can review and approve tasks at step 1
    - user: Can create tasks, view own tasks
    """
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('user', 'User'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='user',
        help_text='User role for permission management'
    )
    
    class Meta:
        db_table = 'users_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        """String representation of user with role."""
        return f"{self.username} ({self.get_role_display()})"
    
    def is_admin(self):
        """Check if user is an admin."""
        return self.role.lower() == 'admin'
    
    def is_manager(self):
        """Check if user is a manager or admin."""
        return self.role.lower() in ['admin', 'manager']
    
    def is_regular_user(self):
        """Check if user is a regular user."""
        return self.role.lower() == 'user'
