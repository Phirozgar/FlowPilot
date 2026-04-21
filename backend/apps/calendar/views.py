"""
Calendar event views.
Events are filtered to the current user's events and their team's events.
"""
import logging
from datetime import date
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import CalendarEvent
from .serializers import CalendarEventSerializer

logger = logging.getLogger(__name__)


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start_time', 'end_time']
    ordering = ['start_time']

    def get_queryset(self):
        """
        Users see their own events.
        Team leaders/superadmins also see their team's events.
        """
        user = self.request.user
        # Base: own events
        qs = CalendarEvent.objects.filter(user=user)

        # Date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(start_time__date__gte=start_date)
        if end_date:
            qs = qs.filter(start_time__date__lte=end_date)

        return qs.order_by('start_time')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        """Return today's events for the current user using server local date."""
        today_date = date.today()
        events = CalendarEvent.objects.filter(
            user=request.user,
            start_time__date=today_date,
        ).order_by('start_time')
        serializer = CalendarEventSerializer(events, many=True)
        return Response(serializer.data)
