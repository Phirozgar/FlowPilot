# Week 2 - Complete API Documentation

## Task Model

### Fields

```
id (PrimaryKey) - Auto-generated
title (CharField, max_length=255) - Task title
description (TextField) - Optional detailed description
status (CharField) - one of: pending, in_review, approved, rejected
approval_step (IntegerField) - Step in workflow (1 or 2)
created_by (ForeignKey) - User who created the task
assigned_to (ForeignKey) - User assigned to the task (optional)
created_at (DateTimeField) - Auto-set on creation
updated_at (DateTimeField) - Auto-updated on modification
```

### Status Choices

| Status | Description |
|--------|-------------|
| pending | Initial state when task is created |
| in_review | Task awaiting approval |
| approved | Task approved at both levels |
| rejected | Task rejected at some step |

## API Endpoints

### 1. Create Task (POST)

**Endpoint**: `POST /api/tasks/`

**Permission**: USER role only

**Request Body**:
```json
{
  "title": "Review Q2 Budget",
  "description": "Need to review and approve Q2 budget allocation",
  "assigned_to_id": 3
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "title": "Review Q2 Budget",
  "description": "Need to review and approve Q2 budget allocation",
  "status": "in_review",
  "approval_step": 1,
  "created_by": {
    "id": 5,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  },
  "assigned_to": {
    "id": 3,
    "username": "jane_manager",
    "email": "jane@example.com",
    "role": "manager"
  },
  "created_at": "2026-02-24T05:42:13.884816Z",
  "updated_at": "2026-02-24T05:42:13.884816Z"
}
```

### 2. List Tasks (GET)

**Endpoint**: `GET /api/tasks/`

**Permission**: Authenticated users

**Query Parameters**:
- None (returns all accessible tasks)

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "title": "Review Q2 Budget",
    "created_by_username": "john_doe",
    "assigned_to_username": "jane_manager",
    "status": "in_review",
    "approval_step": 1,
    "created_at": "2026-02-24T05:42:13.884816Z"
  }
]
```

### 3. Get Task Details (GET)

**Endpoint**: `GET /api/tasks/{id}/`

**Permission**: Authenticated users (can see own tasks)

**Response** (200 OK):
```json
{
  "id": 1,
  "title": "Review Q2 Budget",
  "description": "Need to review and approve Q2 budget allocation",
  "status": "in_review",
  "approval_step": 1,
  "created_by": {...},
  "assigned_to": {...},
  "created_at": "2026-02-24T05:42:13.884816Z",
  "updated_at": "2026-02-24T05:42:13.884816Z"
}
```

### 4. Manager Approves Task - Step 1 (PATCH)

**Endpoint**: `PATCH /api/tasks/{id}/approve/`

**Permission**: MANAGER or ADMIN role

**Action**: Moves approval_step from 1 to 2

**Request Body**: Empty `{}`

**Response** (200 OK):
```json
{
  "detail": "Task approved by manager. Moved to step 2 (Admin review).",
  "task": {
    "id": 1,
    "title": "Review Q2 Budget",
    "status": "in_review",
    "approval_step": 2,
    ...
  }
}
```

### 5. Admin Approves Task - Step 2 (PATCH)

**Endpoint**: `PATCH /api/tasks/{id}/approve/`

**Permission**: ADMIN role only

**Action**: Sets status to 'approved'

**Request Body**: Empty `{}`

**Response** (200 OK):
```json
{
  "detail": "Task approved by admin. Status set to Approved.",
  "task": {
    "id": 1,
    "title": "Review Q2 Budget",
    "status": "approved",
    "approval_step": 2,
    ...
  }
}
```

### 6. Reject Task (PATCH)

**Endpoint**: `PATCH /api/tasks/{id}/reject/`

**Permission**: MANAGER (step 1) or ADMIN (step 2)

**Action**: Sets status to 'rejected'

**Request Body**: Empty `{}`

**Response** (200 OK):
```json
{
  "detail": "Task rejected by manager.",
  "task": {
    "id": 1,
    "title": "Review Q2 Budget",
    "status": "rejected",
    "approval_step": 1,
    ...
  }
}
```

### 7. Get Pending Approval Tasks (GET)

**Endpoint**: `GET /api/tasks/pending_approval/`

**Permission**: Authenticated users

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "title": "Review Q2 Budget",
    "created_by_username": "john_doe",
    "assigned_to_username": "jane_manager",
    "status": "in_review",
    "approval_step": 1,
    "created_at": "2026-02-24T05:42:13.884816Z"
  }
]
```

### 8. Get My Tasks (GET)

**Endpoint**: `GET /api/tasks/my_tasks/`

**Permission**: Authenticated users

**Response**: List of tasks assigned to current user

### 9. Get Tasks I Created (GET)

**Endpoint**: `GET /api/tasks/created_by_me/`

**Permission**: Authenticated users

**Response**: List of tasks created by current user

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |

## cURL Examples

### Create Task
```bash
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review Budget",
    "description": "Q2 budget review",
    "assigned_to_id": 3
  }'
```

### Manager Approves (Step 1)
```bash
curl -X PATCH http://localhost:8000/api/tasks/1/approve/ \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

### Admin Approves (Step 2)
```bash
curl -X PATCH http://localhost:8000/api/tasks/1/approve/ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Reject Task
```bash
curl -X PATCH http://localhost:8000/api/tasks/1/reject/ \
  -H "Authorization: Bearer MANAGER_OR_ADMIN_TOKEN"
```

### Get Pending Tasks
```bash
curl -X GET http://localhost:8000/api/tasks/pending_approval/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```
