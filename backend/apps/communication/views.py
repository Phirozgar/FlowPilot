"""
Communication (Chat) views.

Issue 3 fix:
  `team_group` now looks up members via UserTeamMembership (not user.team FK),
  ensuring newly approved members are always included.
  The `People` tab in Channels.js also needs the same fix — members are fetched
  by team membership, not by `u.team == currentUser.team`.

Issue 9 fix (backend side):
  When fetching channels, only return channels the user is currently a member of.
  The `get_queryset` already does this via `filter(members=user)`.
  On leave (handled in users/views.py), the user is removed from team channels,
  so they naturally stop appearing here.
"""

import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Channel, Message
from .serializers import ChannelSerializer, MessageSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        """
        Return ONLY channels the current user is a member of.
        This automatically enforces Issue 9: after leaving a team,
        the user is removed from channels, so they vanish from this list.
        """
        user = self.request.user
        return Channel.objects.filter(members=user).distinct().order_by('-created_at')

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        channel = self.get_object()

        if request.method == 'GET':
            messages = channel.messages.all().order_by('timestamp')
            return Response(MessageSerializer(messages, many=True).data)

        # POST: send a message
        content = request.data.get('content', '').strip()
        if not content:
            return Response(
                {'error': 'Message content cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Silently re-add the sender if they were somehow removed
        if not channel.members.filter(id=request.user.id).exists():
            channel.members.add(request.user)

        serializer = MessageSerializer(data={'content': content})
        if serializer.is_valid():
            serializer.save(channel=channel, sender=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get', 'post'], url_path='ticket-channel')
    def ticket_channel(self, request):
        """
        GET  ?ticket_id=<id>  — find the channel for a ticket.
        POST {ticket_id: <id>} — find or create the channel, adding current user.
        """
        ticket_number = request.query_params.get('ticket_number') or request.data.get('ticket_number')
        ticket_id = request.query_params.get('ticket_id') or request.data.get('ticket_id')

        if not ticket_number and not ticket_id:
            return Response(
                {'error': 'ticket_number or ticket_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from apps.tasks.models import Task
            if ticket_id:
                ticket = Task.objects.get(id=ticket_id)
            else:
                ticket = Task.objects.get(ticket_number=ticket_number)
        except Task.DoesNotExist:
            return Response({'error': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        existing = Channel.objects.filter(
            channel_type='task',
            name__startswith=f'Ticket #{ticket.ticket_number}:',
        ).first()

        if existing:
            # Ensure current user is a member (idempotent)
            if not existing.members.filter(id=request.user.id).exists():
                existing.members.add(request.user)
            # Ensure ticket creator is a member
            if ticket.created_by and not existing.members.filter(id=ticket.created_by_id).exists():
                existing.members.add(ticket.created_by)
            return Response(ChannelSerializer(existing).data)

        if request.method == 'GET':
            return Response(
                {'error': 'No channel found for this ticket.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # POST: create new channel
        channel_name = f'Ticket #{ticket.ticket_number}: {ticket.title[:40]}'
        channel = Channel.objects.create(name=channel_name, channel_type='task')
        channel.members.add(request.user)
        if ticket.created_by:
            channel.members.add(ticket.created_by)
        if ticket.assigned_to:
            channel.members.add(ticket.assigned_to)

        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def start_dm(self, request):
        """Create or find an existing DM channel between two users."""
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({'error': 'target_user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target_user.id == request.user.id:
            return Response({'error': 'Cannot start a DM with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = Channel.objects.filter(
            channel_type='direct',
            members=request.user,
        ).filter(members=target_user).first()

        if existing:
            return Response(ChannelSerializer(existing).data)

        channel = Channel.objects.create(
            name=f'DM: {request.user.username} & {target_user.username}',
            channel_type='direct',
        )
        channel.members.add(request.user, target_user)
        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def team_group(self, request):
        """
        Get or create the group chat for the current user's active team.

        Issue 3 fix: Members are resolved from UserTeamMembership, NOT from
        user.team FK, so newly approved members are always included when
        the channel is first created. For existing channels, we sync members.
        """
        user = request.user
        if not user.team:
            return Response(
                {'error': 'You are not in a team. Join or switch to a team first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.users.models import UserTeamMembership
        team = user.team
        team_name = team.name

        # Get all current member IDs from the membership table (not from user.team)
        member_ids = list(
            UserTeamMembership.objects.filter(team=team).values_list('user_id', flat=True)
        )

        # Find the existing group channel for this team
        existing = Channel.objects.filter(
            channel_type='group',
            name__iexact=f'{team_name} Group Chat',
        ).first()

        if not existing:
            # Also try a case-insensitive contains match as fallback
            existing = Channel.objects.filter(
                channel_type='group',
                name__icontains=team_name,
            ).first()

        if existing:
            # Sync: add any new members who were approved after channel creation
            existing_member_ids = set(existing.members.values_list('id', flat=True))
            new_ids = [mid for mid in member_ids if mid not in existing_member_ids]
            if new_ids:
                existing.members.add(*new_ids)
                logger.info(
                    'Synced %d new member(s) to group channel "%s"', len(new_ids), existing.name
                )
            # Ensure current user is in
            if not existing.members.filter(id=user.id).exists():
                existing.members.add(user)
            return Response(ChannelSerializer(existing).data)

        # Create new group channel
        channel = Channel.objects.create(
            name=f'{team_name} Group Chat',
            channel_type='group',
        )
        if member_ids:
            channel.members.add(*member_ids)
        else:
            channel.members.add(user)

        logger.info(
            'Created group channel "%s" with %d member(s)', channel.name, len(member_ids)
        )
        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)
