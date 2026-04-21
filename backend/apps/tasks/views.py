"""
Ticket (Task) viewset — hierarchical approval pipeline.

Issue 8: `destroy()` now enforces can_delete() rule:
  creator can only delete if no approvals have happened yet.
Issue 6: Handled via TicketSerializer — 'direct' workflow flag sets
  current_approver_level = team_leader level (1) regardless of creator.
"""

import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.contrib.auth import get_user_model

from .models import Task
from .serializers import TicketSerializer, TicketListSerializer
from .services import TicketPipelineService, TaskQueryService

logger = logging.getLogger(__name__)
User = get_user_model()


class TaskViewSet(viewsets.ModelViewSet):
    """Ticket management with hierarchical approval pipeline."""

    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'ticket_number']
    ordering_fields = ['created_at', 'updated_at', 'status', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = TaskQueryService.get_user_visible_tasks(user)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        assigned_to_param = self.request.query_params.get('assigned_to')
        if assigned_to_param:
            queryset = queryset.filter(
                Q(assigned_to__id=assigned_to_param) |
                Q(assigned_to__username=assigned_to_param)
            )

        created_by_param = self.request.query_params.get('created_by')
        if created_by_param:
            queryset = queryset.filter(
                Q(created_by__id=created_by_param) |
                Q(created_by__username=created_by_param)
            )

        mine = self.request.query_params.get('mine')
        if mine == 'true':
            queryset = queryset.filter(Q(created_by=user) | Q(assigned_to=user))

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer
        return TicketSerializer

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if not request.user.is_leader() and task.created_by != request.user:
            return Response(
                {'detail': 'You may only edit tickets you created.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Issue 8: Enforce can_delete — creator can only delete if
        no approvals have happened yet (still open at initial approver level).
        """
        task = self.get_object()
        can, reason = TicketPipelineService.can_delete(task, request.user)
        if not can:
            return Response({'detail': reason}, status=status.HTTP_403_FORBIDDEN)

        logger.info(
            'Ticket %s deleted by %s', task.ticket_number, request.user.username
        )
        return super().destroy(request, *args, **kwargs)

    # ── Pipeline Actions ──────────────────────────────────────────────────────

    @action(detail=True, methods=['patch', 'post'])
    def approve(self, request, pk=None):
        """Approve the ticket and advance it up the pipeline."""
        task = self.get_object()
        result = TicketPipelineService.approve(task, request.user)
        if result['status'] == 'error':
            return Response({'detail': result['message']}, status=result['code'])
        return Response({
            'detail': result['message'],
            'ticket': TicketSerializer(result['ticket'], context={'request': request}).data,
        }, status=result['code'])

    @action(detail=True, methods=['patch', 'post'])
    def reject(self, request, pk=None):
        """Reject the ticket."""
        task = self.get_object()
        result = TicketPipelineService.reject(task, request.user)
        if result['status'] == 'error':
            return Response({'detail': result['message']}, status=result['code'])
        return Response({
            'detail': result['message'],
            'ticket': TicketSerializer(result['ticket'], context={'request': request}).data,
        }, status=result['code'])

    @action(detail=True, methods=['patch', 'post'])
    def close(self, request, pk=None):
        """Directly close a ticket (team leader+ only)."""
        task = self.get_object()
        result = TicketPipelineService.close(task, request.user)
        if result['status'] == 'error':
            return Response({'detail': result['message']}, status=result['code'])
        return Response({
            'detail': result['message'],
            'ticket': TicketSerializer(result['ticket'], context={'request': request}).data,
        }, status=result['code'])

    @action(detail=True, methods=['patch', 'post'])
    def reopen(self, request, pk=None):
        """Reopen a closed or rejected ticket."""
        task = self.get_object()
        result = TicketPipelineService.reopen(task, request.user)
        if result['status'] == 'error':
            return Response({'detail': result['message']}, status=result['code'])
        return Response({
            'detail': result['message'],
            'ticket': TicketSerializer(result['ticket'], context={'request': request}).data,
        }, status=result['code'])

    # ── Convenience Endpoints ──────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def awaiting_my_review(self, request):
        """Tickets that are at the current user's approval level."""
        user = request.user
        tickets = TaskQueryService.get_user_visible_tasks(user).filter(
            status__in=['open', 'in_review'],
            current_approver_level=user.role_level,
        ).exclude(created_by=user)
        return Response(TicketListSerializer(tickets, many=True).data)

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Tickets created by or assigned to the current user."""
        tickets = self.get_queryset().filter(
            Q(created_by=request.user) | Q(assigned_to=request.user)
        )
        return Response(TicketListSerializer(tickets, many=True).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Aggregate dashboard statistics."""
        stats = TaskQueryService.get_dashboard_stats(request.user)
        return Response(stats)
