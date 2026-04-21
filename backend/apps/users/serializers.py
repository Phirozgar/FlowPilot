from rest_framework import serializers
from .models import CustomUser, Team, UserTeamMembership, TeamJoinRequest


class TeamSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'code', 'organization', 'member_count']
        read_only_fields = ['id', 'code']

    def get_member_count(self, obj):
        return obj.memberships.count()


class UserTeamMembershipSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_code = serializers.CharField(source='team.code', read_only=True)
    team_org = serializers.CharField(source='team.organization', read_only=True)
    team_id = serializers.IntegerField(source='team.id', read_only=True)

    class Meta:
        model = UserTeamMembership
        fields = ['id', 'team_id', 'team_name', 'team_code', 'team_org', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at', 'team_name', 'team_code', 'team_org', 'team_id']


class TeamJoinRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_id = serializers.IntegerField(source='team.id', read_only=True)
    reviewed_by_username = serializers.CharField(
        source='reviewed_by.username', read_only=True, allow_null=True
    )

    class Meta:
        model = TeamJoinRequest
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'team_id', 'team_name', 'requested_role', 'status',
            'reviewed_by_username', 'message', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'username', 'first_name', 'last_name',
            'team_id', 'team_name', 'reviewed_by_username', 'created_at', 'updated_at',
        ]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data. Ensures superusers are always shown as superadmin."""
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_code = serializers.CharField(source='team.code', read_only=True)
    all_teams = serializers.SerializerMethodField()
    # Exposes the effective role (superuser -> 'superadmin')
    role = serializers.SerializerMethodField()
    role_level = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_level', 'team', 'team_name', 'team_code', 'all_teams',
        ]
        read_only_fields = ['id', 'team_name', 'team_code', 'role_level', 'all_teams']

    def get_role(self, obj):
        """Always return 'superadmin' for superusers regardless of stored role field."""
        if obj.is_superuser:
            return 'superadmin'
        return obj.role

    def get_role_level(self, obj):
        return obj.role_level

    def get_all_teams(self, obj):
        memberships = obj.team_memberships.select_related('team').all()
        return UserTeamMembershipSerializer(memberships, many=True).data


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'}
    )

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'email': {'required': True},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': "Passwords don't match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role='intern',
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for login."""
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})
