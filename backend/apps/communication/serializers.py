from rest_framework import serializers
from .models import Channel, Message

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'channel', 'sender', 'sender_name', 'content', 'timestamp']
        read_only_fields = ['id', 'channel', 'sender', 'timestamp']

class ChannelSerializer(serializers.ModelSerializer):
    recent_messages = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = ['id', 'name', 'created_at', 'recent_messages']

    def get_recent_messages(self, obj):
        messages = obj.messages.all().order_by('-timestamp')[:5]
        return MessageSerializer(messages, many=True).data
