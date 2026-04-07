from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from .models import Task
from apps.communication.models import Channel

@receiver(post_save, sender=Task)
def create_task_chat_channel(sender, instance, created, **kwargs):
    if created:
        task_ct = ContentType.objects.get_for_model(Task)
        Channel.objects.create(
            name=f"Task-{instance.id}-Chat",
            content_type=task_ct,
            object_id=instance.id
        )
