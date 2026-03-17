Postman Testing Guide Summary
Content Provided:
Setup Instructions
    Base URL: http://localhost:8000/api/
    How to get JWT tokens for USER, MANAGER, ADMIN
    Environment variables setup
10 Complete Test Cases:
    ✅ Create task (USER creates)
    ✅ List tasks (filtered by role)
    ✅ Update task (PATCH)
    ✅ Delete task (USER only)
    ✅ Approve Step 1 (MANAGER)
    ✅ Approve Step 2 (ADMIN)
    ✅ Reject task (any step)
    ✅ Permission test (USER cannot approve)
    ✅ Permission test (MANAGER cannot delete)
    ✅ Complete workflow test (all 2 steps)
Each Test Case Includes:
    Full HTTP request with headers
    Example request body (JSON)
    Expected response (201, 200, 403, 204, etc.)
    Test validation checklist
    Key behavior notes
Additional Sections:
    Troubleshooting guide
    Postman environment variables template
    Quick test sequence (1-8 steps)


# Task Module - Postman Testing Guide

Complete Postman test cases for manual testing of the Task module. Follow these steps sequentially to verify the entire workflow.

---

## Setup Before Testing

### 1. Base URL
```
http://localhost:8000/api/
```

### 2. Get JWT Tokens

You'll need tokens for 3 users: USER, MANAGER, ADMIN. First, create these users or use existing ones.

#### Get Token for USER
```http
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "username": "regularuser",
  "password": "testpass123"
}
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get Token for MANAGER
```http
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "username": "manager",
  "password": "testpass123"
}
```

#### Get Token for ADMIN
```http
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "testpass123"
}
```

**Save these tokens in Postman:**
- Create an environment with variables:
  - `USER_TOKEN` = access token from USER login
  - `MANAGER_TOKEN` = access token from MANAGER login
  - `ADMIN_TOKEN` = access token from ADMIN login
  - `BASE_URL` = http://localhost:8000/api

---

## Test Case 1: Create Task (USER creates a new task)

### Request
```http
POST {{BASE_URL}}tasks/
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json

{
  "title": "Fix Login Bug",
  "description": "User login timeout issue needs investigation and fix",
  "assigned_to": 2
}
```

**Notes:**
- Only USER role can create tasks
- `assigned_to` should be a valid user ID
- `created_by` is automatically set to the logged-in user
- Status is automatically set to "in_review"
- approval_step is automatically set to 1

### Expected Response (201 Created)
```json
{
  "id": 1,
  "title": "Fix Login Bug",
  "description": "User login timeout issue needs investigation and fix",
  "status": "in_review",
  "approval_step": 1,
  "created_by": {
    "id": 1,
    "username": "regularuser",
    "email": "user@example.com",
    "role": "USER"
  },
  "assigned_to": {
    "id": 2,
    "username": "manager",
    "email": "manager@example.com",
    "role": "MANAGER"
  },
  "created_at": "2026-03-17T04:01:17Z",
  "updated_at": "2026-03-17T04:01:17Z"
}
```

### Test Validation
- [x] Status code is 201
- [x] `approval_step` = 1
- [x] `status` = "in_review"
- [x] `created_by` matches logged-in user
- [x] Save the task ID (e.g., 1) for next tests

---

## Test Case 2: List All Tasks (USER gets filtered list)

### Request
```http
GET {{BASE_URL}}tasks/
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json
```

### Expected Response (200 OK)
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Fix Login Bug",
      "description": "User login timeout issue...",
      "status": "in_review",
      "approval_step": 1,
      "created_by": 1,
      "created_by_username": "regularuser",
      "assigned_to": 2,
      "assigned_to_username": "manager",
      "created_at": "2026-03-17T04:01:17Z",
      "updated_at": "2026-03-17T04:01:17Z"
    }
  ]
}
```

**Note:** Regular users see only their own created tasks and assigned tasks. Managers/Admins see all tasks.

### Test Validation
- [x] Status code is 200
- [x] Results contain at least the task created in Test Case 1
- [x] Response uses lightweight TaskListSerializer (ID/username instead of nested objects)

---

## Test Case 3: Update Task (USER updates their own task)

### Request
```http
PATCH {{BASE_URL}}tasks/{task_id}/
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json

{
  "description": "UPDATED: User login timeout issue - severity HIGH - needs urgent fix"
}
```

**Replace `{task_id}` with the ID from Test Case 1 (e.g., 1)**

### Expected Response (200 OK)
```json
{
  "id": 1,
  "title": "Fix Login Bug",
  "description": "UPDATED: User login timeout issue - severity HIGH - needs urgent fix",
  "status": "in_review",
  "approval_step": 1,
  "created_by": {
    "id": 1,
    "username": "regularuser",
    "email": "user@example.com",
    "role": "USER"
  },
  "assigned_to": {
    "id": 2,
    "username": "manager",
    "email": "manager@example.com",
    "role": "MANAGER"
  },
  "created_at": "2026-03-17T04:01:17Z",
  "updated_at": "2026-03-17T04:05:30Z"
}
```

### Test Validation
- [x] Status code is 200
- [x] `description` is updated
- [x] `updated_at` timestamp changed
- [x] Cannot update `status` or `approval_step` via PATCH (approval must use dedicated endpoints)

---

## Test Case 4: Approve Task - Step 1 (MANAGER approves)

### Request
```http
POST {{BASE_URL}}tasks/{task_id}/approve/
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{
  "approval_notes": "Code review passed. Looks good to proceed to admin approval."
}
```

**Replace `{task_id}` with task ID from Test Case 1**

### Expected Response (200 OK)
```json
{
  "id": 1,
  "title": "Fix Login Bug",
  "description": "UPDATED: User login timeout issue - severity HIGH - needs urgent fix",
  "status": "in_review",
  "approval_step": 2,
  "created_by": {
    "id": 1,
    "username": "regularuser",
    "email": "user@example.com",
    "role": "USER"
  },
  "assigned_to": {
    "id": 2,
    "username": "manager",
    "email": "manager@example.com",
    "role": "MANAGER"
  },
  "created_at": "2026-03-17T04:01:17Z",
  "updated_at": "2026-03-17T04:10:45Z"
}
```

### Key Changes After Manager Approval
- `approval_step` changes from 1 → 2
- `status` remains "in_review" (changes only after admin approval)
- Task moves to admin review queue

### Test Validation
- [x] Status code is 200
- [x] `approval_step` = 2 (moved from 1)
- [x] `status` still = "in_review"
- [x] Only MANAGER role can call this endpoint at step 1
- [x] Attempting with USER token should return 403 Forbidden

---

## Test Case 5: Approve Task - Step 2 (ADMIN approves)

### Request
```http
POST {{BASE_URL}}tasks/{task_id}/approve/
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "approval_notes": "Final approval granted. Ready for implementation."
}
```

**Replace `{task_id}` with task ID**

### Expected Response (200 OK)
```json
{
  "id": 1,
  "title": "Fix Login Bug",
  "description": "UPDATED: User login timeout issue - severity HIGH - needs urgent fix",
  "status": "approved",
  "approval_step": 2,
  "created_by": {
    "id": 1,
    "username": "regularuser",
    "email": "user@example.com",
    "role": "USER"
  },
  "assigned_to": {
    "id": 2,
    "username": "manager",
    "email": "manager@example.com",
    "role": "MANAGER"
  },
  "created_at": "2026-03-17T04:01:17Z",
  "updated_at": "2026-03-17T04:15:22Z"
}
```

### Key Changes After Admin Approval
- `status` changes from "in_review" → "approved"
- `approval_step` remains 2
- Task is now complete and approved

### Test Validation
- [x] Status code is 200
- [x] `status` = "approved"
- [x] Only ADMIN role can approve at step 2
- [x] USER or MANAGER attempting this should return 403 Forbidden

---

## Test Case 6: Reject Task (MANAGER rejects at step 1)

### Request (Create a new task first)
```http
POST {{BASE_URL}}tasks/
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json

{
  "title": "Update Documentation",
  "description": "Update API documentation for new endpoints",
  "assigned_to": 2
}
```

**Save the ID of this new task (e.g., 2)**

### Then Reject It
```http
POST {{BASE_URL}}tasks/{task_id}/reject/
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{
  "rejection_reason": "Requirements are unclear. Please clarify scope with stakeholders."
}
```

### Expected Response (200 OK)
```json
{
  "id": 2,
  "title": "Update Documentation",
  "description": "Update API documentation for new endpoints",
  "status": "rejected",
  "approval_step": 1,
  "created_by": {
    "id": 1,
    "username": "regularuser",
    "email": "user@example.com",
    "role": "USER"
  },
  "assigned_to": {
    "id": 2,
    "username": "manager",
    "email": "manager@example.com",
    "role": "MANAGER"
  },
  "created_at": "2026-03-17T04:20:10Z",
  "updated_at": "2026-03-17T04:20:55Z"
}
```

### Key Changes After Rejection
- `status` changes to "rejected"
- Can happen at any approval step
- `approval_step` remains unchanged

### Test Validation
- [x] Status code is 200
- [x] `status` = "rejected"
- [x] Rejection can happen at any step
- [x] Task is marked as rejected and workflow stops

---

## Test Case 7: Delete Task (USER deletes their own task)

### Request
```http
DELETE {{BASE_URL}}tasks/{task_id}/
Authorization: Bearer {{USER_TOKEN}}
```

**Use a task not yet in approval workflow**

### Expected Response (204 No Content)
```
(Empty response body)
```

### Test Validation
- [x] Status code is 204
- [x] Task is deleted from database
- [x] Verify with GET list call (task should not appear)

---

## Test Case 8: Permission Test - USER Cannot Approve

### Request
```http
POST {{BASE_URL}}tasks/{task_id}/approve/
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json

{
  "approval_notes": "I approve this"
}
```

### Expected Response (403 Forbidden)
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### Test Validation
- [x] Status code is 403
- [x] Regular users cannot approve tasks
- [x] Only MANAGER (step 1) and ADMIN (step 2) can approve

---

## Test Case 9: Permission Test - MANAGER Cannot Delete Task

### Request
```http
DELETE {{BASE_URL}}tasks/{task_id}/
Authorization: Bearer {{MANAGER_TOKEN}}
```

### Expected Response (403 Forbidden)
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### Test Validation
- [x] Status code is 403
- [x] Only task creator can delete their task

---

## Test Case 10: Complete Workflow Test

**Run these sequentially to test the full 2-step approval process:**

### Step 1: USER creates task
```http
POST {{BASE_URL}}tasks/
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json

{
  "title": "Complete API Integration",
  "description": "Integrate payment gateway with backend",
  "assigned_to": 2
}
```
Save the response `id` (e.g., 3)

### Step 2: MANAGER approves (Step 1)
```http
POST {{BASE_URL}}tasks/3/approve/
Authorization: Bearer {{MANAGER_TOKEN}}
Content-Type: application/json

{
  "approval_notes": "Design looks good"
}
```
✓ Verify: `approval_step` = 2, `status` = "in_review"

### Step 3: ADMIN approves (Step 2)
```http
POST {{BASE_URL}}tasks/3/approve/
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "approval_notes": "Approved for implementation"
}
```
✓ Verify: `approval_step` = 2, `status` = "approved"

### Step 4: Verify final state
```http
GET {{BASE_URL}}tasks/3/
Authorization: Bearer {{ADMIN_TOKEN}}
```
✓ Verify: Complete task object with `status` = "approved"

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Token expired. Get a new token from auth/login/ |
| 403 Forbidden | User role doesn't have permission for this action |
| 404 Not Found | Task ID doesn't exist. Use GET /tasks/ to list all tasks |
| 400 Bad Request | Missing required fields or invalid data format |
| Cannot create task | Only USER role can create. Use USER_TOKEN |
| Cannot approve | MANAGER approves at step 1, ADMIN at step 2 |

---

## Environment Variables in Postman

Create an environment named "FlowPilot Task Testing" with:

```json
{
  "BASE_URL": "http://localhost:8000/api/",
  "USER_TOKEN": "your_user_access_token",
  "MANAGER_TOKEN": "your_manager_access_token",
  "ADMIN_TOKEN": "your_admin_access_token"
}
```

---

## Quick Test Sequence

1. ✓ Get tokens (Test Cases 1 setup)
2. ✓ Create task as USER
3. ✓ List tasks
4. ✓ Update task
5. ✓ Approve as MANAGER (step 1)
6. ✓ Approve as ADMIN (step 2)
7. ✓ Test permissions (try USER approving - should fail)
8. ✓ Complete workflow test

All tests should pass ✓
