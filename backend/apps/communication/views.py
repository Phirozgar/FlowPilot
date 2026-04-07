from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Channel, Message
from .serializers import ChannelSerializer, MessageSerializer

class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        channel = self.get_object()
        
        if request.method == 'GET':
            messages = channel.messages.all().order_by('timestamp')
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = MessageSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(channel=channel, sender=request.user)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
