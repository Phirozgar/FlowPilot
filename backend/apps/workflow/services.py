from django.db import transaction
from django.core.exceptions import PermissionDenied
from .models import WorkflowInstance, WorkflowAction

class WorkflowEngine:
    def _get_level_for_role(self, role_str):
        mapping = {
            'superadmin': 0,
            'team lead': 1, 'team leader': 1,
            'senior dev': 2, 'senior developer': 2,
            'junior dev': 3, 'junior developer': 3,
            'intern': 4
        }
        return mapping.get(role_str.lower(), 5)

    @transaction.atomic
    def execute_action(self, instance: WorkflowInstance, user, action: str, comments: str = ""):
        current_step = instance.current_step
        
        req_level = self._get_level_for_role(current_step.required_role)
        if user.role_level > req_level:
            raise PermissionDenied(f"You must be at least a {current_step.required_role} to approve this step.")
            
        creator_level = instance.task.created_by.role_level if instance.task.created_by else 5
        if user.role_level >= creator_level and not user.is_superadmin():
            raise PermissionDenied("Only a higher-level employee can approve this workflow task.")
        
        # Audit Trail
        WorkflowAction.objects.create(
            instance=instance, step=current_step,
            user=user, action=action, comments=comments
        )
        
        if action == "APPROVE":
            next_step = self._get_next_step(instance.workflow, current_step)
            if next_step:
                instance.current_step = next_step
                instance.status = "ACTIVE"
                # Here we would trigger notifications:
                # notify_users_by_role(next_step.required_role, f"Action needed for ID {instance.id}")
            else:
                instance.status = "COMPLETED"
                instance.current_step = None
                # Mark associated task as complete
                instance.task.status = 'approved'
                instance.task.save()
                
        elif action == "REJECT":
            instance.status = "REJECTED"
            instance.task.status = 'rejected'
            instance.task.save()
            
        instance.save()
        return instance

    def _get_next_step(self, workflow, current_step):
        steps = list(workflow.steps.all().order_by('step_order'))
        try:
            idx = steps.index(current_step)
            if idx + 1 < len(steps):
                return steps[idx + 1]
        except ValueError:
            pass
        return None
