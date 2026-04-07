from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

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
    
    # Polymorphic relation to link chat context to Task or Workflow
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    context_object = GenericForeignKey('content_type', 'object_id')

    def __str__(self):
        return f"Channel: {self.name}"

class Message(models.Model):
    channel = models.ForeignKey(Channel, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:20]}"
