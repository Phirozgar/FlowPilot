"""
User management views for authentication and user administration.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import CustomUser, Team, UserTeamMembership
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    TeamSerializer, UserTeamMembershipSerializer
)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def join(self, request):
        """Join a team by code. Creates a membership record and sets as active team."""
        code = request.data.get('code')
        role = request.data.get('role', 'intern')  # Optional: let inviter pre-set role

        if not code:
            return Response({'error': 'Team code is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            team = Team.objects.get(code=code)

            # Create or update membership record
            membership, created = UserTeamMembership.objects.get_or_create(
                user=request.user, team=team,
                defaults={'role': role}
            )

            # Set as active team
            request.user.team = team
            # Update role from membership
            request.user.role = membership.role
            request.user.save()

            return Response({
                'message': f'Successfully joined {team.name}',
                'team': TeamSerializer(team).data,
                'membership': UserTeamMembershipSerializer(membership).data,
            })
        except Team.DoesNotExist:
            return Response({'error': 'Invalid team code. Please check with your Team Leader.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def switch(self, request):
        """Switch active team. User must already be a member."""
        team_id = request.data.get('team_id')
        if not team_id:
            return Response({'error': 'team_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            membership = UserTeamMembership.objects.get(user=request.user, team_id=team_id)
            request.user.team = membership.team
            request.user.role = membership.role
            request.user.save()
            return Response({
                'message': f'Switched to {membership.team.name}',
                'user': UserSerializer(request.user).data,
            })
        except UserTeamMembership.DoesNotExist:
            return Response({'error': 'You are not a member of this team.'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_teams(self, request):
        """Get all teams the current user belongs to."""
        memberships = UserTeamMembership.objects.filter(user=request.user).select_related('team')
        return Response(UserTeamMembershipSerializer(memberships, many=True).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'register', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superadmin():
            return Response(
                {'detail': 'You do not have permission to delete users.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                username=serializer.validated_data['username'],
                password=serializer.validated_data['password']
            )
            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'message': 'Login successful',
                    'user': UserSerializer(user).data,
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                }, status=status.HTTP_200_OK)
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def by_role(self, request):
        if not request.user.is_leader():
            return Response(
                {'detail': 'You do not have permission to view users by role.'},
                status=status.HTTP_403_FORBIDDEN
            )
        role = request.query_params.get('role')
        if not role:
            return Response({'error': 'role parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        users = CustomUser.objects.filter(role=role)
        return Response(UserSerializer(users, many=True).data)
