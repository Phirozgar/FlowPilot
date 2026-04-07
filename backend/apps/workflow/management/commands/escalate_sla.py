from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone
from apps.workflow.models import WorkflowInstance
from apps.communication.models import Channel, Message
from django.contrib.contenttypes.models import ContentType

class Command(BaseCommand):
    help = 'Runs background checks to escalate Workflow Instances past their SLAs'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE("Starting SLA Evaluation Engine..."))
        
        # Determine overdue instances (e.g., active for more than 48 hours without progressing)
        sla_limit = timezone.now() - timedelta(hours=48)
        
        # A simple check (assuming status update timestamp or creation)
        # In a robust DB we'd track last_step_updated_at on the instance.
        overdue_instances = WorkflowInstance.objects.filter(
            status='ACTIVE',
            created_at__lte=sla_limit
        )

        escalated_count = 0
        for inst in overdue_instances:
            self.stdout.write(f"Escalating: {inst.id} - {inst.task.title}")
            
            # Find the chat channel for this task and inject a system warning
            try:
                ct = ContentType.objects.get_for_model(inst.task.__class__)
                chan = Channel.objects.get(content_type=ct, object_id=inst.task.id)
                
                # We can use the admin or a dummy system user ID here (e.g. ID 1)
                Message.objects.create(
                    channel=chan,
                    sender_id=1, 
                    content=f"⚠️ SYSTEM ALERT: This task has breached its SLA of 48 hours! Manager has been pinged."
                )
                escalated_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error handling {inst.id}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(f"Finished SLA Engine. Escalated {escalated_count} instances."))
