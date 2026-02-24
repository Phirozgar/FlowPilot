from rest_framework import permissions


class IsAdminOrManager(permissions.BasePermission):
    """Permission for Admin and Manager roles."""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_admin() or request.user.is_manager())
        )


class IsAdmin(permissions.BasePermission):
    """Permission for Admin role only."""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_admin()
        )


class IsTaskCreatorOrAssigned(permissions.BasePermission):
    """Permission to view/edit only if user created or is assigned to the task."""
    
    def has_object_permission(self, request, view, obj):
        return (
            obj.created_by == request.user or
            obj.assigned_to == request.user or
            request.user.is_manager()
        )


class CanAssignTask(permissions.BasePermission):
    """Permission to assign tasks (only managers and admins)."""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_manager())
        )


class CanApproveTask(permissions.BasePermission):
    """Permission to approve tasks (only managers and admins)."""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_manager())
        )
