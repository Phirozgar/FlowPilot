# API Specification

This file enumerates every request the backend supports, including HTTP method, path, request body parameters and expected response codes/structures. It complements `POSTMAN_TESTS.md` by focusing on a concise technical summary.

| # | Method | Endpoint | Request Body (JSON) | Required Auth | Expected Success Response |
|---|--------|----------|---------------------|---------------|--------------------------|
| 1 | POST | `/api/users/register/` | `username`, `email`, `password`, `password2` | No | 201 `{ message: "User registered successfully" }` |
| 2 | POST | `/api/auth/token/` | `username`, `password` | No | 200 `{'access': <token>, 'refresh': <token>}` |
| 3 | POST | `/api/auth/token/refresh/` | `refresh` | No | 200 `{'access': <new_token>}` |
| 4 | GET | `/api/users/me/` | — | Bearer | 200 user object |
| 5 | GET | `/api/users/` | — | Manager/Admin | 200 list of users |
| 6 | GET | `/api/users/{id}/` | — | Bearer | 200 user object |
| 7 | DELETE | `/api/users/{id}/` | — | Admin | 204 no content |
| 8 | GET | `/api/users/by_role/?role={role}` | — | Bearer | 200 list of users |
| 9 | POST | `/api/tasks/` | `title`, `description` (opt), `assigned_to_id` (opt) | Bearer (user role) | 201 task object |
|10 | GET | `/api/tasks/` | — | Bearer | 200 list (TaskListSerializer) |
|11 | GET | `/api/tasks/{id}/` | — | Bearer | 200 task object |
|12 | PATCH | `/api/tasks/{id}/` | partial fields | Creator/Manager/Admin | 200 updated task |
|13 | DELETE | `/api/tasks/{id}/` | — | Creator/Admin | 204 |
|14 | PATCH | `/api/tasks/{id}/assign/` | `user_id` | Manager/Admin | 200 updated task |
|15 | PATCH | `/api/tasks/{id}/change_status/` | `status` | Creator/Assignee/Manager/Admin | 200 updated task |
|16 | PATCH | `/api/tasks/{id}/approve/` | — | Role depends on approval_step | 200 message+task |
|17 | PATCH | `/api/tasks/{id}/reject/` | — | Role depends on approval_step | 200 message+task |
|18 | GET | `/api/tasks/pending_approval/` | — | Bearer | 200 list (
|19 | GET | `/api/tasks/my_tasks/` | — | Bearer | 200 list |
|20 | GET | `/api/tasks/created_by_me/` | — | Bearer | 200 list |
|21 | GET | `/api/tasks/by_status/?status={status}` | — | Bearer | 200 list |

> **Notes:**
> - `Bearer` indicates any valid JWT; some endpoints additionally restrict by role.
> - Task responses use either `TaskSerializer` or `TaskListSerializer` as appropriate.

This spec may be copied into automated documentation or used as a reference when writing clients.