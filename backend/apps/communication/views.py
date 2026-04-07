from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Channel, Message
from .serializers import ChannelSerializer, MessageSerializer

User = get_user_model()

class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return channels the current user is a member of, plus task channels from their team."""
        user = self.request.user
        return Channel.objects.filter(
            Q(members=user) | Q(channel_type='task')
        ).distinct().order_by('-created_at')

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

    @action(detail=False, methods=['post'])
    def start_dm(self, request):
        """Create or find an existing DM channel between current user and target user."""
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({'error': 'target_user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user.id == request.user.id:
            return Response({'error': 'Cannot DM yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if DM already exists between these two users
        existing = Channel.objects.filter(
            channel_type='direct',
            members=request.user
        ).filter(
            members=target_user
        ).first()

        if existing:
            return Response(ChannelSerializer(existing).data)

        # Create new DM channel
        channel = Channel.objects.create(
            name=f'DM: {request.user.username} & {target_user.username}',
            channel_type='direct'
        )
        channel.members.add(request.user, target_user)
        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def team_group(self, request):
        """Get or create the team group chat for the current user's team."""
        user = request.user
        if not user.team:
            return Response({'error': 'You are not in a team'}, status=status.HTTP_400_BAD_REQUEST)

        team_name = user.team.name
        existing = Channel.objects.filter(
            channel_type='group',
            name__icontains=team_name
        ).first()

        if existing:
            # Ensure current user is a member
            if not existing.members.filter(id=user.id).exists():
                existing.members.add(user)
            return Response(ChannelSerializer(existing).data)

        # Create the group
        channel = Channel.objects.create(
            name=f'{team_name} Group Chat',
            channel_type='group'
        )
        # Add all team members
        team_members = User.objects.filter(team=user.team)
        channel.members.add(*team_members)
        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)
