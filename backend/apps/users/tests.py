from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import CustomUser


def create_user(**kwargs):
    return CustomUser.objects.create_user(**kwargs)


class UserAPITests(APITestCase):
    def setUp(self):
        # create an admin and a manager and a regular user for tests
        self.admin = create_user(username='admin', password='pass12345', role='admin')
        self.manager = create_user(username='manager', password='pass12345', role='manager')
        self.user = create_user(username='user', password='pass12345', role='user')

    def authenticate(self, user):
        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username': user.username, 'password': 'pass12345'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_register_and_login(self):
        url = reverse('user-register')
        data = {'username': 'bob', 'email': 'bob@example.com', 'password': 'abc12345', 'password2': 'abc12345'}
        resp = self.client.post(url, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # login with new credentials
        url = reverse('user-login')
        resp = self.client.post(url, {'username': 'bob', 'password': 'abc12345'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', resp.data)

    def test_list_users_permission(self):
        url = reverse('user-list')
        # unauthenticated should be denied
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        # regular user cannot list
        self.authenticate(self.user)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        # manager can list
        self.authenticate(self.manager)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_delete_user_only_admin(self):
        url = reverse('user-detail', args=[self.user.id])
        # manager attempt
        self.authenticate(self.manager)
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        # admin can delete
        self.authenticate(self.admin)
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
