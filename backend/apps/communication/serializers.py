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
    member_names = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = ['id', 'name', 'channel_type', 'created_at', 'recent_messages', 'member_names']
        read_only_fields = ['id', 'created_at']

    def get_recent_messages(self, obj):
        messages = obj.messages.all().order_by('-timestamp')[:1]
        return MessageSerializer(messages, many=True).data

    def get_member_names(self, obj):
        return [{'id': m.id, 'username': m.username, 'role': m.role,
                 'first_name': m.first_name, 'last_name': m.last_name}
                for m in obj.members.all()]
