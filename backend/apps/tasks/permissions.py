"""
Custom permissions for task management.

Defines role-based permissions for task operations:
- Only users can create tasks
- Managers can approve at step 1
- Admins can approve at step 2
"""

from rest_framework.permissions import BasePermission


class IsRegularUser(BasePermission):
    """
    Allow only regular users (non-manager, non-admin) to access.
    Used for task creation.
    """
    message = "Only regular users can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_regular_user()


class IsManagerOrAdmin(BasePermission):
    """
    Allow managers and admins to access.
    Used for approving/rejecting tasks at step 1.
    """
    message = "Only managers and admins can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_manager()


class IsAdmin(BasePermission):
    """
    Allow only admins to access.
    Used for final task approval at step 2.
    """
    message = "Only admins can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin()
