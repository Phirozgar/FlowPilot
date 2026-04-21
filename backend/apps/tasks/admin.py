from django.contrib import admin
from .models import Task, TicketLog


class TicketLogInline(admin.TabularInline):
    model = TicketLog
    extra = 0
    readonly_fields = ('actor', 'action', 'note', 'timestamp')
    can_delete = False
    ordering = ('timestamp',)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'title', 'status', 'priority', 'created_by', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('title', 'description', 'ticket_number')
    readonly_fields = ('ticket_number', 'created_at', 'updated_at')
    inlines = [TicketLogInline]
    fieldsets = (
        ('Ticket Info', {
            'fields': ('ticket_number', 'title', 'description', 'priority')
        }),
        ('Assignment', {
            'fields': ('created_by', 'assigned_to')
        }),
        ('Approval Pipeline', {
            'fields': ('status', 'current_approver_level', 'approval_step')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TicketLog)
class TicketLogAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'actor', 'action', 'note', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('ticket__ticket_number', 'actor__username', 'note')
    readonly_fields = ('ticket', 'actor', 'action', 'note', 'timestamp')
    ordering = ('-timestamp',)
