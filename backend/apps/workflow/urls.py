from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowTemplateViewSet, WorkflowInstanceViewSet, WorkflowStepViewSet

router = DefaultRouter()
router.register(r'templates', WorkflowTemplateViewSet)
router.register(r'steps', WorkflowStepViewSet)
router.register(r'instances', WorkflowInstanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
