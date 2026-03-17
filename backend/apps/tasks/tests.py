from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import CustomUser
from .models import Task


def create_user(username, role='user'):
    return CustomUser.objects.create_user(username=username, password='pass12345', role=role)


class TaskAPITest(APITestCase):
    def setUp(self):
        self.user = create_user('u1', 'user')
        self.manager = create_user('mgr', 'manager')
        self.admin = create_user('adm', 'admin')

    def authenticate(self, user):
        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username': user.username, 'password': 'pass12345'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_create_task_by_user(self):
        self.authenticate(self.user)
        url = reverse('task-list')
        data = {'title': 'foo', 'description': 'bar'}
        resp = self.client.post(url, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'pending')
        self.assertEqual(resp.data['created_by']['username'], self.user.username)

    def test_create_task_by_manager_forbidden(self):
        self.authenticate(self.manager)
        url = reverse('task-list')
        resp = self.client.post(url, {'title': 'x'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_approval_workflow(self):
        # create a task
        self.authenticate(self.user)
        resp = self.client.post(reverse('task-list'), {'title': 't1'})
        task_id = resp.data['id']
        # manager should see it in pending_approval
        self.authenticate(self.manager)
        resp = self.client.get(reverse('task-pending-approval'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(any(t['id'] == task_id for t in resp.data))
        # manager approves step1
        resp = self.client.patch(reverse('task-approve', args=[task_id]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        task = resp.data['task']
        self.assertEqual(task['approval_step'], 2)
        self.assertEqual(task['status'], 'in_review')
        # admin approves step2
        self.authenticate(self.admin)
        resp = self.client.patch(reverse('task-approve', args=[task_id]))
        task = resp.data['task']
        self.assertEqual(task['status'], 'approved')

    def test_reject_flow(self):
        self.authenticate(self.user)
        resp = self.client.post(reverse('task-list'), {'title': 't2'})
        task_id = resp.data['id']
        # reject as manager
        self.authenticate(self.manager)
        resp = self.client.patch(reverse('task-reject', args=[task_id]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['task']['status'], 'rejected')

    def test_assign_and_status_change(self):
        self.authenticate(self.user)
        resp = self.client.post(reverse('task-list'), {'title': 't3'})
        task_id = resp.data['id']
        # manager assigns
        self.authenticate(self.manager)
        resp = self.client.patch(reverse('task-assign', args=[task_id]), {'user_id': self.user.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['task']['assigned_to']['username'], self.user.username)
        # assigned user can change status
        self.authenticate(self.user)
        resp = self.client.patch(reverse('task-change-status', args=[task_id]), {'status': 'in_review'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['task']['status'], 'in_review')

    def test_update_and_delete_permissions(self):
        # create a task as regular user
        self.authenticate(self.user)
        resp = self.client.post(reverse('task-list'), {'title': 't-priv'})
        task_id = resp.data['id']
        # another regular user should not be able to update/delete
        other = create_user('other', 'user')
        self.authenticate(other)
        # regular other user shouldn't even see the task (404)
        resp = self.client.patch(reverse('task-detail', args=[task_id]), {'title': 'hacked'})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        resp = self.client.delete(reverse('task-detail', args=[task_id]))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        # creator can update/delete
        self.authenticate(self.user)
        resp = self.client.patch(reverse('task-detail', args=[task_id]), {'title': 'updated'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.delete(reverse('task-detail', args=[task_id]))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_filter_by_status(self):
        self.authenticate(self.user)
        self.client.post(reverse('task-list'), {'title': 'filter1'})
        self.authenticate(self.manager)
        resp = self.client.get(reverse('task-by-status') + '?status=pending')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp.data) >= 1)
