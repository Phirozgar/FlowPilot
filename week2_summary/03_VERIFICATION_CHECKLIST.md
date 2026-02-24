# Week 2 - Verification Checklist

## ✅ Pre-Deployment Checklist

### Database & Migrations

- [ ] Run: `python3 manage.py showmigrations tasks`
- [ ] Verify 3 migrations are applied:
  - [ ] `[X] 0001_initial`
  - [ ] `[X] 0002_initial`
  - [ ] `[X] 0003_remove_task_priority_task_approval_step_and_more`
- [ ] Run: `python3 manage.py migrate`
- [ ] All migrations applied successfully

### Model Verification

- [ ] Task model has all required fields:
  - [ ] title
  - [ ] description
  - [ ] status (with 4 choices)
  - [ ] approval_step (default=1)
  - [ ] created_by
  - [ ] assigned_to
  - [ ] created_at
  - [ ] updated_at
- [ ] approval_step field is IntegerField with default=1
- [ ] priority field is removed
- [ ] Status choices are: pending, in_review, approved, rejected

### User Authentication

- [ ] User model has role field
- [ ] Roles available: admin, manager, user
- [ ] Role methods work:
  - [ ] is_admin()
  - [ ] is_manager()
  - [ ] is_regular_user()

### Serializers

- [ ] TaskSerializer includes all fields
- [ ] approval_step is present in serializer
- [ ] TaskListSerializer is lightweight
- [ ] Nested user objects serialize correctly

### ViewSet & Endpoints

- [ ] TaskViewSet has all 10 actions:
  - [ ] list
  - [ ] create
  - [ ] retrieve
  - [ ] update
  - [ ] partial_update
  - [ ] destroy
  - [ ] approve
  - [ ] reject
  - [ ] pending_approval
  - [ ] my_tasks
  - [ ] created_by_me

### API Endpoints - Test Each

#### Create Task (USER)
- [ ] POST /api/tasks/ returns 201
- [ ] Status auto-set to 'in_review'
- [ ] approval_step auto-set to 1
- [ ] Only USER role can create

#### List Tasks
- [ ] GET /api/tasks/ returns 200
- [ ] Respects user permissions
- [ ] Returns correct fields

#### Manager Approve (Step 1)
- [ ] PATCH /api/tasks/{id}/approve/ returns 200
- [ ] approval_step changes 1→2
- [ ] Manager can approve
- [ ] User cannot approve (403)

#### Admin Approve (Step 2)
- [ ] PATCH /api/tasks/{id}/approve/ returns 200
- [ ] status changes to 'approved'
- [ ] Only admin can approve step 2
- [ ] Manager cannot approve step 2

#### Rejection
- [ ] PATCH /api/tasks/{id}/reject/ returns 200
- [ ] status changes to 'rejected'
- [ ] Can reject at any step
- [ ] Proper role checks enforced

#### Filtering Endpoints
- [ ] GET /api/tasks/pending_approval/ returns 200
- [ ] GET /api/tasks/my_tasks/ returns 200
- [ ] GET /api/tasks/created_by_me/ returns 200

### Permission Tests

- [ ] USER can create: ✅
- [ ] USER cannot approve: ❌ (403)
- [ ] MANAGER can approve step 1: ✅
- [ ] MANAGER cannot approve step 2: ❌ (403)
- [ ] ADMIN can approve step 2: ✅
- [ ] ADMIN can view all tasks: ✅
- [ ] USER can only see own tasks: ✅

### Admin Interface

- [ ] Django admin accessible
- [ ] Tasks section shows:
  - [ ] title
  - [ ] status
  - [ ] approval_step
  - [ ] created_by
  - [ ] assigned_to
  - [ ] created_at
- [ ] Can filter by status
- [ ] Can filter by approval_step
- [ ] Can edit fields

### Workflow Test (Happy Path)

1. [ ] USER creates task
   - Status: in_review ✓
   - approval_step: 1 ✓

2. [ ] MANAGER approves step 1
   - approval_step: 2 ✓
   - Status: still in_review ✓

3. [ ] ADMIN approves step 2
   - Status: approved ✓
   - Workflow complete ✓

### Workflow Test (Rejection Path)

1. [ ] USER creates task
   - Status: in_review ✓

2. [ ] MANAGER rejects at step 1
   - Status: rejected ✓
   - Workflow ends ✓

3. [ ] Or ADMIN rejects at step 2
   - Status: rejected ✓
   - Workflow ends ✓

### Django System Check

- [ ] Run: `python3 manage.py check`
- [ ] Result: "System check identified no issues"

### Server Startup

- [ ] Run: `python3 manage.py runserver`
- [ ] Server starts without errors
- [ ] Can access http://localhost:8000/api/tasks/

### Test Data

- [ ] Can create test users with different roles
- [ ] Can create test tasks
- [ ] Can execute full workflow
- [ ] Can verify all status transitions

## 🧪 Test Execution Commands

```bash
# Check system
python3 manage.py check

# Create test user
python3 manage.py shell

# In shell:
from apps.users.models import CustomUser
from apps.tasks.models import Task
user = CustomUser.objects.create_user('test', 'pass', role='user')
mgr = CustomUser.objects.create_user('mgr', 'pass', role='manager')
admin = CustomUser.objects.create_user('admin', 'pass', role='admin')

# Create task
task = Task.objects.create(title="Test", created_by=user)

# Verify
print(f"Status: {task.status}, Step: {task.approval_step}")

# Update workflow
task.approval_step = 2
task.save()
task.status = 'approved'
task.save()

# Run server
python3 manage.py runserver
```

## 📊 Expected Results

- All tests pass: ✅
- No errors on startup: ✅
- All endpoints functional: ✅
- Workflow executes correctly: ✅
- Permissions enforced: ✅

## 🔄 Regression Testing

- [ ] Week 1 features still work:
  - [ ] User creation
  - [ ] JWT authentication
  - [ ] Login endpoint
  - [ ] User roles
- [ ] No breaking changes introduced
- [ ] Database integrity maintained

## ✨ Sign-Off

- [ ] All tests passed
- [ ] All checklists completed
- [ ] Ready for frontend development
- [ ] Ready for production deployment

**Date Completed**: ___________

**Verified By**: ___________

**Notes**: 
___________________________________________________________
___________________________________________________________
