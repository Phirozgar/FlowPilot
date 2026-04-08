from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Channel(models.Model):
    CHANNEL_TYPES = [
        ('group', 'Group'),
        ('direct', 'Direct Message'),
        ('task', 'Task Channel'),
    ]
    name = models.CharField(max_length=255)
    channel_type = models.CharField(max_length=10, choices=CHANNEL_TYPES, default='task')
    members = models.ManyToManyField(User, related_name='chat_channels', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Channel: {self.name}"

class Message(models.Model):
    channel = models.ForeignKey(Channel, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender_id}: {self.content[:20]}"
