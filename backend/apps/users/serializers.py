from rest_framework import serializers
from .models import CustomUser, Team

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data."""
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_code = serializers.CharField(source='team.code', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'role_level', 'team', 'team_name', 'team_code']
        read_only_fields = ['id', 'team_name', 'team_code', 'role_level']


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'email': {'required': True}
        }
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': "Passwords don't match"})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role='intern'  # Default role
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for login."""
    
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})
