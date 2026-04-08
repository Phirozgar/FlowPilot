from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class CalendarEvent(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_events')

    def __str__(self):
        return self.title
