from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChannelViewSet

router = DefaultRouter()
router.register(r'channels', ChannelViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
