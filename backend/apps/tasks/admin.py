from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'approval_step', 'created_by', 'assigned_to', 'created_at')
    list_filter = ('status', 'approval_step', 'created_at')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Task Info', {
            'fields': ('title', 'description')
        }),
        ('Assignment', {
            'fields': ('created_by', 'assigned_to')
        }),
        ('Approval Workflow', {
            'fields': ('status', 'approval_step')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
