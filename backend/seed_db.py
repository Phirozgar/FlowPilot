import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.workflow.models import WorkflowTemplate, WorkflowStep, WorkflowInstance
from apps.tasks.models import Task
from apps.communication.models import Channel, Message
from apps.calendar.models import CalendarEvent
from apps.users.models import Team

User = get_user_model()

print("Purging old data for a fresh seed...")
WorkflowInstance.objects.all().delete()
Task.objects.all().delete()
Channel.objects.all().delete()
CalendarEvent.objects.all().delete()
WorkflowTemplate.objects.all().delete()
Team.objects.all().delete()

# Clear all except superusers that are built-in if any.
User.objects.exclude(is_superuser=True).delete() 

print("Seeding Teams...")
eng_team = Team.objects.create(name="Engineering Team", code="ENG-101", organization="FlowPilot Inc")

print("Seeding Users...")
admin_user, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@flowpilot.local'})
admin_user.set_password('admin123')
admin_user.role = 'superadmin'
admin_user.save()

team_leader, _ = User.objects.get_or_create(username='team_leader', defaults={'email': 'lead@flowpilot.local'})
team_leader.set_password('pass123')
team_leader.role = 'team_leader'
team_leader.team = eng_team
team_leader.save()

senior_1 = User.objects.create_user(username='senior_dev_1', email='sr1@flowpilot.local', password='pass123', role='senior_dev', team=eng_team)
senior_2 = User.objects.create_user(username='senior_dev_2', email='sr2@flowpilot.local', password='pass123', role='senior_dev', team=eng_team)

junior_1 = User.objects.create_user(username='junior_dev_1', email='jr1@flowpilot.local', password='pass123', role='junior_dev', team=eng_team)
junior_2 = User.objects.create_user(username='junior_dev_2', email='jr2@flowpilot.local', password='pass123', role='junior_dev', team=eng_team)

intern_1 = User.objects.create_user(username='intern_1', email='in1@flowpilot.local', password='pass123', role='intern', team=eng_team)
intern_2 = User.objects.create_user(username='intern_2', email='in2@flowpilot.local', password='pass123', role='intern', team=eng_team)
intern_3 = User.objects.create_user(username='intern_3', email='in3@flowpilot.local', password='pass123', role='intern', team=eng_team)

print("Seeding Workflow Templates...")
dev_lifecycle = WorkflowTemplate.objects.create(
    name='Development Lifecycle Approval',
    description='Hierarchical approval from Intern through Superadmin.',
    is_active=True,
    created_by=team_leader
)
step1 = WorkflowStep.objects.create(workflow=dev_lifecycle, step_order=1, name='Junior Developer Review', required_role='Junior Developer')
step2 = WorkflowStep.objects.create(workflow=dev_lifecycle, step_order=2, name='Senior Developer Review', required_role='Senior Developer')
step3 = WorkflowStep.objects.create(workflow=dev_lifecycle, step_order=3, name='Team Leader Review', required_role='Team Leader')
step4 = WorkflowStep.objects.create(workflow=dev_lifecycle, step_order=4, name='Superadmin Signoff', required_role='Superadmin')

print("Seeding Tasks & Instances...")
task1 = Task.objects.create(
    title='Setup CI/CD Pipeline',
    created_by=intern_1,
    assigned_to=junior_1,
    status='pending',
    description='Initial setup of the pipeline configurations.'
)
inst1 = WorkflowInstance.objects.create(
    workflow=dev_lifecycle,
    task=task1,
    current_step=step1,
    status='ACTIVE'
)

print("Seeding Communication Channels...")
from django.contrib.contenttypes.models import ContentType
task_ct = ContentType.objects.get_for_model(Task)

chan1, _ = Channel.objects.get_or_create(name=f'Task-{task1.id}-Chat', content_type=task_ct, object_id=task1.id)
Message.objects.create(channel=chan1, sender=intern_1, content='I have completed the initial YAML config. Please review.')
Message.objects.create(channel=chan1, sender=junior_1, content='Looking at it now.')

print("Seeding Calendar Events...")
CalendarEvent.objects.create(
    title='Sprint Planning',
    description='Weekly sync for Eng Team',
    start_time=timezone.now() + timedelta(days=1),
    end_time=timezone.now() + timedelta(days=1, hours=1),
    user=team_leader,
    linked_task=task1
)

print("Dummy data successfully populated!")
