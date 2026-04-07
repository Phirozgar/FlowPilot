from rest_framework import viewsets, permissions
from .models import CalendarEvent
from .serializers import CalendarEventSerializer

class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users only see events assigned to them
        return CalendarEvent.objects.filter(user=self.request.user).order_by('start_time')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
