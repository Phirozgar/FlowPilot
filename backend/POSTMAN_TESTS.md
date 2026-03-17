# Postman Testing Guide for FlowPilot Backend

This document lives in `backend/POSTMAN_TESTS.md` and is intended to be a **living checklist** of API requests you can run from Postman (or any HTTP client).  It covers setup, authentication, roles and every endpoint available in the backend.  Update this file as new features are added or behaviour changes.

---

## 1. Preparation

1. Ensure the development server is running:
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1     # if not already active
   python manage.py runserver
   ```
   The server should respond at `http://127.0.0.1:8000/`.

2. Open Postman and create an environment with these variables:
   - `{{baseUrl}}` = `http://localhost:8000`
   - `{{accessToken}}` = (empty, filled after login)
   - `{{refreshToken}}` = (empty)

3. Add a “Bearer Token” authorization to collections or requests using `{{accessToken}}`.


## 2. Superuser and roles

- You have created a superuser:
  - **username**: `admin`
  - **email**: `admin@gmail.com`
  - **password**: `password@123`

Superuser can log in via the regular token endpoint and has full access to all API routes.

Use the Django admin (`http://localhost:8000/admin/`) to create additional users with roles `manager` or `user` as needed.

> ⚠️ When sending requests, switch the `{{accessToken}}` value to match the user you want to simulate.


## 3. Authentication requests

| # | Description | Method / URL | Body | Expected status |
|---|-------------|--------------|------|-----------------|
| 1 | Register new user | POST {{baseUrl}}/api/users/register/ | `{ "username":"bob","email":"bob@example.com","password":"abc12345","password2":"abc12345" }` | 201 Created |
| 2 | Obtain JWT tokens | POST {{baseUrl}}/api/auth/token/ | `{ "username":"<user>","password":"<pass>" }` | 200 OK, returns `access`/`refresh` |
| 3 | Refresh access token | POST {{baseUrl}}/api/auth/token/refresh/ | `{ "refresh":"{{refreshToken}}" }` | 200 OK |
| 4 | Get current user | GET {{baseUrl}}/api/users/me/ | — (bearer token) | 200 OK |

After obtaining tokens, set `{{accessToken}}` to the returned access value.  Save `{{refreshToken}}` if you plan to refresh.


## 4. User endpoints

| # | Description | Method / URL | Notes |
|---|-------------|--------------|-------|
| 5 | List all users | GET {{baseUrl}}/api/users/ | Requires manager/admin |
| 6 | Get single user | GET {{baseUrl}}/api/users/{id}/ | |
| 7 | Delete user | DELETE {{baseUrl}}/api/users/{id}/ | Admin only |
| 8 | Filter users by role | GET {{baseUrl}}/api/users/by_role/?role=manager | Query string |


## 5. Task endpoints

Detailed below with sample request bodies and expected outcomes.

### 5.1 Creating tasks

| # | Description | Request |
|---|-------------|---------|
| 9 | Create task (only regular `user` role) | `POST {{baseUrl}}/api/tasks/`<br>Body: `{ "title":"Review Q2","description":"...","assigned_to_id":2 }` |

### 5.2 Retrieving tasks

| # | Description | Request |
|---|-------------|---------|
|10| List tasks (filtered by role) | `GET {{baseUrl}}/api/tasks/` |
|11| Get task details | `GET {{baseUrl}}/api/tasks/{id}/` |
|12| My tasks | `GET {{baseUrl}}/api/tasks/my_tasks/` |
|13| Tasks I created | `GET {{baseUrl}}/api/tasks/created_by_me/` |
|14| Filter by status | `GET {{baseUrl}}/api/tasks/by_status/?status=pending` |
|15| Pending approval | `GET {{baseUrl}}/api/tasks/pending_approval/` |

### 5.3 Mutating tasks

| # | Description | Request | Notes |
|---|-------------|---------|-------|
|16| Update a task | `PATCH {{baseUrl}}/api/tasks/{id}/`<br>Body: partial fields | Creator/manager/admin only |
|17| Delete a task | `DELETE {{baseUrl}}/api/tasks/{id}/` | Creator or admin |
|18| Assign task | `PATCH {{baseUrl}}/api/tasks/{id}/assign/`<br>Body: `{ "user_id":<id> }` | Manager/Admin only |
|19| Change status | `PATCH {{baseUrl}}/api/tasks/{id}/change_status/`<br>Body: `{ "status":"in_review" }` | Creator/assignee/manager/admin |
|20| Approve step 1 & 2 | `PATCH {{baseUrl}}/api/tasks/{id}/approve/` | Role dependent on `approval_step` |
|21| Reject task | `PATCH {{baseUrl}}/api/tasks/{id}/reject/` | Role dependent on `approval_step` |


## 6. Role‑specific scenarios to test

1. **Regular user**
   - Create task, view own tasks, update/delete own tasks.
   - Attempt to access other users' tasks → should get 404 / 403.
   - Try to use manager/admin endpoints → receive 403.

2. **Manager**
   - View all tasks, assign, approve/reject step 1.
   - Try to approve step 2 → 403.

3. **Admin**
   - View all tasks, approve/reject step 2, delete any task.
   - Access user list and delete users.


## 7. Common Postman collection tips

- Group requests by feature (Auth, Users, Tasks).
- Use pre-request script to automatically set `{{accessToken}}` from a login response.
- Add tests (Postman tests tab) to verify status codes and response shapes.
- Save environment variables after login to quickly switch between users.


## 8. After creating a superuser

You can continue using Postman for all API testing; the superuser is only needed to

1. Create other users via the admin panel or API.
2. Manually inspect/modify database records if needed.

**You do not need to log in as the superuser in Postman** unless you want to
exercise admin‑only endpoints.  Instead, create users with the desired role and
use their tokens in the `{{accessToken}}` variable.


## 9. Keeping this file up-to-date

- Whenever new endpoints are added or existing behaviour changes, add an entry
  in this document with request details and expected results.
- Use version control to track updates and review them when merging new features.

---

This file provides a complete, self‑contained reference for manual API testing.
Keep using Postman to explore and verify the backend; the superuser is simply a
powerful fixture you can use to manage users and data.

Happy testing!  ✨