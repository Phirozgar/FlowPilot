"""
User management views for authentication and user administration.
"""

import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import transaction

from .models import CustomUser, Team, UserTeamMembership, TeamJoinRequest
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    TeamSerializer, UserTeamMembershipSerializer, TeamJoinRequestSerializer,
)

logger = logging.getLogger(__name__)

VALID_ROLES = ['superadmin', 'team_leader', 'senior_dev', 'junior_dev', 'intern']


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Only privileged roles can create teams.
        The creator is automatically added as team_leader.
        """
        user = self.request.user
        if not user.can_create_team():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "Only Superadmin, Team Leaders, and Senior Developers can create teams."
            )

        team = serializer.save()

        # Auto-add creator as team_leader
        creator_role = 'superadmin' if user.is_superadmin() else 'team_leader'
        membership, _ = UserTeamMembership.objects.get_or_create(
            user=user,
            team=team,
            defaults={'role': creator_role},
        )

        # Set as active team
        user.team = team
        user.role = creator_role
        user.save(update_fields=['team', 'role'])

        logger.info(
            'Team "%s" created by %s; creator added as %s',
            team.name, user.username, creator_role,
        )

    # ─── Join / Leave / Switch ────────────────────────────────────────────────

    @action(detail=False, methods=['post'])
    def join(self, request):
        """
        Submit a join request to a team via invite code.
        The user specifies their desired role.
        A team_leader/superadmin of that team must approve.
        """
        code = request.data.get('code', '').strip().upper()
        role = request.data.get('role', 'intern')

        if not code:
            return Response(
                {'error': 'Team invite code is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if role not in VALID_ROLES:
            return Response(
                {'error': f'Invalid role. Valid options: {", ".join(VALID_ROLES)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            team = Team.objects.get(code=code)
        except Team.DoesNotExist:
            return Response(
                {'error': 'Invalid team code. Please get the correct code from your Team Leader.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Already a member?
        if UserTeamMembership.objects.filter(user=request.user, team=team).exists():
            return Response(
                {'error': 'You are already a member of this team.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Already has a pending request for this team?
        if TeamJoinRequest.objects.filter(user=request.user, team=team, status='pending').exists():
            return Response(
                {
                    'error': (
                        'You already have a pending join request for this team. '
                        'Please wait for a manager to approve it.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        join_request = TeamJoinRequest.objects.create(
            user=request.user,
            team=team,
            requested_role=role,
            status='pending',
        )

        return Response(
            {
                'message': f'Join request submitted for "{team.name}". Waiting for manager approval.',
                'request': TeamJoinRequestSerializer(join_request).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'])
    def switch(self, request):
        """Switch the active team. User must already be a member."""
        team_id = request.data.get('team_id')
        if not team_id:
            return Response({'error': 'team_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            membership = UserTeamMembership.objects.select_related('team').get(
                user=request.user, team_id=team_id
            )
        except UserTeamMembership.DoesNotExist:
            return Response(
                {'error': 'You are not a member of that team.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        request.user.team = membership.team
        request.user.role = membership.role
        request.user.save(update_fields=['team', 'role'])

        return Response({
            'message': f'Switched to {membership.team.name}.',
            'user': UserSerializer(request.user).data,
        })

    @action(detail=False, methods=['get'])
    def my_teams(self, request):
        """Return all teams the current user belongs to."""
        memberships = (
            UserTeamMembership.objects
            .filter(user=request.user)
            .select_related('team')
        )
        return Response(UserTeamMembershipSerializer(memberships, many=True).data)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def leave(self, request):
        """
        Leave a team.
        - Removes the UserTeamMembership record.
        - Removes user from any chat channels associated with that team.
        - Switches active team if this was the active one.
        """
        team_id = request.data.get('team_id')
        if not team_id:
            return Response({'error': 'team_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            membership = UserTeamMembership.objects.select_related('team').get(
                user=request.user, team_id=team_id
            )
        except UserTeamMembership.DoesNotExist:
            return Response(
                {'error': 'You are not a member of this team.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        team_name = membership.team.name
        leaving_team = membership.team

        # Remove membership
        membership.delete()

        # Remove user from all chat channels associated with this team's tickets
        try:
            from apps.communication.models import Channel
            # Remove from team group channels and task channels belonging to this team
            # (channels named after this team or task channels for tickets in this team)
            channels_to_leave = Channel.objects.filter(members=request.user)
            team_channels = channels_to_leave.filter(
                name__icontains=team_name
            )
            task_channels = Channel.objects.filter(
                channel_type='task',
                members=request.user,
            ).filter(
                # ticket channels for tickets created by members of the left team
                name__icontains='Ticket #'
            )
            for ch in team_channels:
                ch.members.remove(request.user)

            # For task channels: remove only if the ticket was created by someone in the left team
            for ch in task_channels:
                # Resolve ticket from channel name
                try:
                    import re
                    m = re.search(r'Ticket #(TKT-\w+)', ch.name)
                    if m:
                        ticket_num = m.group(1)
                        from apps.tasks.models import Task
                        ticket = Task.objects.select_related('created_by').get(
                            ticket_number=ticket_num
                        )
                        if ticket.created_by and ticket.created_by.team_id == int(team_id):
                            ch.members.remove(request.user)
                except Exception:
                    pass  # Non-fatal
        except Exception as e:
            logger.warning('Could not fully clean up channels after leaving %s: %s', team_name, e)

        # Switch active team if needed
        if request.user.team_id == int(team_id):
            next_membership = (
                UserTeamMembership.objects
                .filter(user=request.user)
                .select_related('team')
                .first()
            )
            if next_membership:
                request.user.team = next_membership.team
                request.user.role = next_membership.role
            else:
                request.user.team = None
                request.user.role = 'intern'
            request.user.save(update_fields=['team', 'role'])

        return Response({
            'message': f'Successfully left "{team_name}".',
            'user': UserSerializer(request.user).data,
        })

    # ─── Join Request Management ──────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def pending_requests(self, request):
        """
        Returns pending join requests for all teams the current user leads.
        Only team_leader and superadmin roles can access this.
        """
        user = request.user
        if not user.is_leader():
            return Response(
                {'error': 'Only Team Leaders and Superadmins can view join requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Collect team IDs where this user is a leader
        leader_team_ids = set(
            UserTeamMembership.objects.filter(
                user=user, role__in=['team_leader', 'superadmin']
            ).values_list('team_id', flat=True)
        )
        # Also include active team if leader role
        if user.team_id and user.role in ['team_leader', 'superadmin']:
            leader_team_ids.add(user.team_id)
        # Superadmins with is_superuser flag see all pending requests
        if user.is_superuser:
            qs = TeamJoinRequest.objects.filter(status='pending').select_related('user', 'team')
        else:
            qs = TeamJoinRequest.objects.filter(
                team_id__in=leader_team_ids, status='pending'
            ).select_related('user', 'team')

        return Response(TeamJoinRequestSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'])
    def approve_request(self, request):
        """
        Approve a pending join request.
        The approver must be a team_leader/superadmin of that specific team.
        """
        request_id = request.data.get('request_id')
        if not request_id:
            return Response({'error': 'request_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            join_req = TeamJoinRequest.objects.select_related('user', 'team').get(
                id=request_id, status='pending'
            )
        except TeamJoinRequest.DoesNotExist:
            return Response(
                {'error': 'Join request not found or already processed.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Authorisation: must be leader of that team or global superadmin
        is_team_leader = UserTeamMembership.objects.filter(
            user=request.user,
            team=join_req.team,
            role__in=['team_leader', 'superadmin'],
        ).exists()

        if not is_team_leader and not request.user.is_superadmin():
            return Response(
                {'error': 'You must be a Team Leader or Superadmin of this team to approve requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            # Upsert membership
            membership, created = UserTeamMembership.objects.get_or_create(
                user=join_req.user,
                team=join_req.team,
                defaults={'role': join_req.requested_role},
            )
            if not created:
                membership.role = join_req.requested_role
                membership.save(update_fields=['role'])

            # Set as active team if user currently has no team
            if not join_req.user.team:
                join_req.user.team = join_req.team
                join_req.user.role = join_req.requested_role
                join_req.user.save(update_fields=['team', 'role'])

            # Resolve the request
            join_req.status = 'approved'
            join_req.reviewed_by = request.user
            join_req.save(update_fields=['status', 'reviewed_by', 'updated_at'])

        # Issue 3: Add the new member to the team's group chat channel immediately.
        # This is done outside the atomic block so a channel failure doesn't roll back membership.
        try:
            from apps.communication.models import Channel
            team_name = join_req.team.name
            group_channel = Channel.objects.filter(
                channel_type='group',
                name__iexact=f'{team_name} Group Chat',
            ).first()
            if not group_channel:
                group_channel = Channel.objects.filter(
                    channel_type='group',
                    name__icontains=team_name,
                ).first()
            if group_channel and not group_channel.members.filter(id=join_req.user.id).exists():
                group_channel.members.add(join_req.user)
                logger.info(
                    'Added %s to group channel "%s" after join approval.',
                    join_req.user.username, group_channel.name,
                )
        except Exception as ch_err:
            logger.warning('Could not add %s to group channel after approval: %s', join_req.user.username, ch_err)

        logger.info(
            'Join request #%s approved: %s → %s as %s (by %s)',
            join_req.id, join_req.user.username, join_req.team.name,
            join_req.requested_role, request.user.username,
        )

        return Response({
            'message': (
                f'{join_req.user.username} has been approved and added to '
                f'"{join_req.team.name}" as {join_req.requested_role}.'
            ),
            'request': TeamJoinRequestSerializer(join_req).data,
        })

    @action(detail=False, methods=['post'])
    def reject_request(self, request):
        """
        Reject a pending join request.
        The rejecter must be a team_leader/superadmin of that specific team.
        """
        request_id = request.data.get('request_id')
        message = request.data.get('message', '')

        if not request_id:
            return Response({'error': 'request_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            join_req = TeamJoinRequest.objects.select_related('user', 'team').get(
                id=request_id, status='pending'
            )
        except TeamJoinRequest.DoesNotExist:
            return Response(
                {'error': 'Join request not found or already processed.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        is_team_leader = UserTeamMembership.objects.filter(
            user=request.user,
            team=join_req.team,
            role__in=['team_leader', 'superadmin'],
        ).exists()

        if not is_team_leader and not request.user.is_superadmin():
            return Response(
                {'error': 'You must be a Team Leader or Superadmin of this team to reject requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        join_req.status = 'rejected'
        join_req.reviewed_by = request.user
        join_req.message = message
        join_req.save(update_fields=['status', 'reviewed_by', 'message', 'updated_at'])

        logger.info(
            'Join request #%s rejected: %s → %s (by %s)',
            join_req.id, join_req.user.username, join_req.team.name, request.user.username,
        )

        return Response({
            'message': f'Join request from {join_req.user.username} has been rejected.',
            'request': TeamJoinRequestSerializer(join_req).data,
        })

    @action(detail=False, methods=['get'])
    def my_join_requests(self, request):
        """Return the current user's own join requests (all statuses)."""
        qs = TeamJoinRequest.objects.filter(
            user=request.user
        ).select_related('team', 'reviewed_by').order_by('-created_at')
        return Response(TeamJoinRequestSerializer(qs, many=True).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['register', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superadmin():
            return Response(
                {'detail': 'Only superadmins can delete users.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Account created successfully. You can now log in.'},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )
        if not user:
            return Response(
                {'error': 'Invalid username or password. Please try again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful.',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
        })

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['get'])
    def by_role(self, request):
        if not request.user.is_leader():
            return Response(
                {'detail': 'Insufficient permissions.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        role = request.query_params.get('role')
        if not role:
            return Response({'error': 'role query param is required.'}, status=status.HTTP_400_BAD_REQUEST)
        users = CustomUser.objects.filter(role=role)
        return Response(UserSerializer(users, many=True).data)
