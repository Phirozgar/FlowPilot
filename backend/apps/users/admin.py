from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser, Team, UserTeamMembership, TeamJoinRequest


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Team', {'fields': ('role', 'team')}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'team')
    list_filter = BaseUserAdmin.list_filter + ('role', 'team')


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'organization')
    search_fields = ('name', 'code', 'organization')


@admin.register(UserTeamMembership)
class UserTeamMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'role', 'joined_at')
    list_filter = ('role', 'team')
    search_fields = ('user__username', 'team__name')


@admin.register(TeamJoinRequest)
class TeamJoinRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'requested_role', 'status', 'reviewed_by', 'created_at')
    list_filter = ('status', 'requested_role', 'team')
    search_fields = ('user__username', 'team__name')
    readonly_fields = ('created_at', 'updated_at')
