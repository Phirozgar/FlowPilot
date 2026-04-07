"""
User management views for authentication and user administration.

Handles user registration, login, and role-based user management.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import CustomUser, Team
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, TeamSerializer

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def join(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Team code is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            team = Team.objects.get(code=code)
            request.user.team = team
            request.user.save()
            return Response({'message': f'Successfully joined {team.name}', 'team': TeamSerializer(team).data})
        except Team.DoesNotExist:
            return Response({'error': 'Invalid team code'}, status=status.HTTP_404_NOT_FOUND)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management and authentication.
    
    Endpoints:
    - List users: /api/users/ (managers/admins only)
    - Register: /api/users/register/
    - Login: /api/users/login/
    - Current user info: /api/users/me/
    - Filter by role: /api/users/by_role/
    - Delete user: /api/users/{id}/ (admins only)
    """
    
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Allow registration and login without authentication."""
        if self.action in ['create', 'register', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def list(self, request, *args, **kwargs):
        """List all users for system-wide collaboration."""
        return super().list(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user. Only superadmins allowed."""
        if not request.user.is_superadmin():
            return Response(
                {'detail': 'You do not have permission to delete users.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Register a new user."""
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'User registered successfully'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """Login user and return JWT tokens."""
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
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current authenticated user."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def by_role(self, request):
        """Get users by role."""
        if not request.user.is_leader():
            return Response(
                {'detail': 'You do not have permission to view users by role.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        role = request.query_params.get('role')
        if not role:
            return Response(
                {'error': 'role parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = CustomUser.objects.filter(role=role)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
