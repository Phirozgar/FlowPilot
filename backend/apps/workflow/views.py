from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WorkflowTemplate, WorkflowStep, WorkflowInstance
from .serializers import WorkflowTemplateSerializer, WorkflowStepSerializer, WorkflowInstanceSerializer, WorkflowActionSerializer
from .services import WorkflowEngine

from rest_framework.exceptions import PermissionDenied

class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    queryset = WorkflowTemplate.objects.all().order_by('name')
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if getattr(obj.created_by, 'role_level', 5) < request.user.role_level and not request.user.is_superadmin():
                raise PermissionDenied("You cannot modify a workflow created by a higher-ranking employee.")

class WorkflowStepViewSet(viewsets.ModelViewSet):
    queryset = WorkflowStep.objects.all()
    serializer_class = WorkflowStepSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        workflow = serializer.validated_data['workflow']
        if getattr(workflow.created_by, 'role_level', 5) < self.request.user.role_level and not self.request.user.is_superadmin():
            raise PermissionDenied("You cannot modify steps in a workflow created by a higher-ranking employee.")
        serializer.save()

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if getattr(obj.workflow.created_by, 'role_level', 5) < request.user.role_level and not request.user.is_superadmin():
                raise PermissionDenied("You cannot modify steps in a workflow created by a higher-ranking employee.")

class WorkflowInstanceViewSet(viewsets.ModelViewSet):
    queryset = WorkflowInstance.objects.all().order_by('-created_at')
    
    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if hasattr(user, 'is_superadmin') and user.is_superadmin():
            return qs
        if getattr(user, 'team', None):
            return qs.filter(task__created_by__team=user.team)
        return qs.none()
    serializer_class = WorkflowInstanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def action(self, request, pk=None):
        instance = self.get_object()
        action_type = request.data.get('action')
        comments = request.data.get('comments', '')

        if not action_type or action_type not in ['APPROVE', 'REJECT']:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        engine = WorkflowEngine()
        try:
            # We assume request.user is authenticated
            updated_instance = engine.execute_action(instance, request.user, action_type, comments)
            return Response(WorkflowInstanceSerializer(updated_instance).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
