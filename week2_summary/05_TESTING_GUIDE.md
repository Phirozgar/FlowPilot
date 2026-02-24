# Week 2 - Complete Testing Guide

## Step-by-Step Testing Instructions

### Phase 1: Pre-Testing Setup

#### Step 1.1: Verify Installation
```bash
cd /home/WP_B2/Desktop/sem6/OpsFlow/backend
python3 manage.py check
```

Expected output:
```
System check identified no issues (0 silenced).
```

#### Step 1.2: Run Migrations
```bash
python3 manage.py migrate
```

Expected output:
```
Running migrations:
...
Applying tasks.0003_remove_task_priority_task_approval_step_and_more... OK
```

#### Step 1.3: Verify Database
```bash
python3 manage.py shell
```

In Python shell:
```python
from apps.tasks.models import Task
from apps.users.models import CustomUser

# Check Task model
print(Task._meta.get_fields())
# Should show 9 fields including approval_step

# Check CustomUser model
user = CustomUser.objects.create_user('testuser', 'pass', role='user')
print(user.is_regular_user())  # Should print: True
```

---

### Phase 2: Model Testing

#### Test 2.1: Create Task
```python
from apps.tasks.models import Task
from apps.users.models import CustomUser

user = CustomUser.objects.create_user('testuser', 'testpass', role='user')
task = Task.objects.create(
    title="Test Task",
    description="Testing task creation",
    created_by=user
)

print(f"Task created: {task.id}")
print(f"Status: {task.status}")        # Should be: pending
print(f"Approval Step: {task.approval_step}")  # Should be: 1
print(f"Created By: {task.created_by}")  # Should be: testuser
```

#### Test 2.2: Update Status
```python
task.status = 'in_review'
task.save()
print(f"Updated Status: {task.status}")  # Should be: in_review

task.approval_step = 2
task.save()
print(f"Updated Step: {task.approval_step}")  # Should be: 2

task.status = 'approved'
task.save()
print(f"Final Status: {task.status}")  # Should be: approved
```

---

### Phase 3: Serializer Testing

#### Test 3.1: TaskSerializer
```python
from apps.tasks.serializers import TaskSerializer
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.get('/api/tasks/')

serializer = TaskSerializer(task, context={'request': request})
data = serializer.data

print("TaskSerializer fields:")
for field in data.keys():
    print(f"  - {field}")

# Verify approval_step is present
assert 'approval_step' in data
print("✓ approval_step field present")
```

#### Test 3.2: TaskListSerializer
```python
from apps.tasks.serializers import TaskListSerializer

serializer = TaskListSerializer(task)
data = serializer.data

print("TaskListSerializer fields:")
for field in data.keys():
    print(f"  - {field}")

# Should have lightweight set of fields
assert 'approval_step' in data
print("✓ Lightweight serializer working")
```

---

### Phase 4: API Endpoint Testing

Start the development server:
```bash
python3 manage.py runserver
```

#### Test 4.1: Get JWT Token

**Command**:
```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

**Expected Response**:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Copy the access token for subsequent requests.

#### Test 4.2: List Tasks

**Command**:
```bash
curl -X GET http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "title": "Test Task",
    "created_by_username": "testuser",
    "status": "in_review",
    "approval_step": 1,
    "created_at": "2026-02-24T..."
  }
]
```

#### Test 4.3: Create Task (USER)

**Command**:
```bash
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Task",
    "description": "Testing task creation via API"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 2,
  "title": "New Task",
  "status": "in_review",
  "approval_step": 1,
  "created_by": {...},
  ...
}
```

#### Test 4.4: Manager Approval (Step 1)

**Command**:
```bash
curl -X PATCH http://localhost:8000/api/tasks/2/approve/ \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "detail": "Task approved by manager. Moved to step 2 (Admin review).",
  "task": {
    "id": 2,
    "approval_step": 2,
    "status": "in_review",
    ...
  }
}
```

#### Test 4.5: Admin Approval (Step 2)

**Command**:
```bash
curl -X PATCH http://localhost:8000/api/tasks/2/approve/ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "detail": "Task approved by admin. Status set to Approved.",
  "task": {
    "id": 2,
    "approval_step": 2,
    "status": "approved",
    ...
  }
}
```

#### Test 4.6: Rejection Test

**Command**:
```bash
curl -X PATCH http://localhost:8000/api/tasks/3/reject/ \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "detail": "Task rejected by manager.",
  "task": {
    "id": 3,
    "status": "rejected",
    ...
  }
}
```

#### Test 4.7: Permission Denial (USER tries to approve)

**Command**:
```bash
curl -X PATCH http://localhost:8000/api/tasks/2/approve/ \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected Response** (403 Forbidden):
```json
{
  "detail": "Only managers can approve at step 1."
}
```

#### Test 4.8: Pending Approval Endpoint

**Command**:
```bash
curl -X GET http://localhost:8000/api/tasks/pending_approval/ \
  -H "Authorization: Bearer TOKEN"
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "title": "Task in review",
    "status": "in_review",
    "approval_step": 1,
    ...
  }
]
```

---

### Phase 5: Admin Interface Testing

1. Start server: `python3 manage.py runserver`
2. Navigate to: http://localhost:8000/admin/
3. Login with admin credentials
4. Click on "Tasks" in sidebar

**Verify**:
- [ ] Can see list of tasks
- [ ] approval_step column visible
- [ ] status column visible
- [ ] Can filter by status
- [ ] Can filter by approval_step
- [ ] Can edit task details
- [ ] Can see created_by and assigned_to

---

### Phase 6: Full Workflow Test

#### Scenario: Complete Approval Flow

1. **USER Creates Task**
   ```bash
   curl -X POST http://localhost:8000/api/tasks/ \
     -H "Authorization: Bearer USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Budget Review","description":"Q2 budget"}'
   ```
   Expected: Status=in_review, Step=1

2. **MANAGER Approves (Step 1)**
   ```bash
   curl -X PATCH http://localhost:8000/api/tasks/1/approve/ \
     -H "Authorization: Bearer MANAGER_TOKEN"
   ```
   Expected: Step becomes 2

3. **ADMIN Approves (Step 2)**
   ```bash
   curl -X PATCH http://localhost:8000/api/tasks/1/approve/ \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```
   Expected: Status becomes approved

---

### Phase 7: Error Handling Tests

#### Test: Invalid Status
```bash
curl -X PATCH http://localhost:8000/api/tasks/1/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"invalid_status"}'
```
Expected: 400 Bad Request

#### Test: Non-existent Task
```bash
curl -X GET http://localhost:8000/api/tasks/99999/ \
  -H "Authorization: Bearer TOKEN"
```
Expected: 404 Not Found

#### Test: Unauthorized Access
```bash
curl -X GET http://localhost:8000/api/tasks/
```
Expected: 401 Unauthorized (no token provided)

---

### Phase 8: Data Validation

#### Test: Missing Required Field
```bash
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"No title provided"}'
```
Expected: 400 Bad Request with error message

#### Test: Long Title
```bash
# Title with 300+ characters
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"A very long title that exceeds...(300 chars)"}'
```
Expected: 400 Bad Request (exceeds max_length=255)

---

## Test Results Documentation

### Date: ______________

### Test Environment
- OS: _______________
- Python Version: _______________
- Django Version: _______________

### Results

| Test | Status | Notes |
|------|--------|-------|
| System Check | ☐ Pass | |
| Migrations | ☐ Pass | |
| Model Creation | ☐ Pass | |
| Serializers | ☐ Pass | |
| Create Task | ☐ Pass | |
| List Tasks | ☐ Pass | |
| Manager Approve | ☐ Pass | |
| Admin Approve | ☐ Pass | |
| Rejection | ☐ Pass | |
| Permission Denial | ☐ Pass | |
| Admin Interface | ☐ Pass | |
| Full Workflow | ☐ Pass | |

### Issues Found

1. Issue: _______________
   Resolution: _______________

2. Issue: _______________
   Resolution: _______________

### Sign-Off

- [ ] All tests passed
- [ ] No critical issues
- [ ] Ready for deployment

**Tested By**: _______________
**Date**: _______________
