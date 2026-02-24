# OpsFlow Backend

Django REST Framework backend for OpsFlow - a task management and approval workflow system.

## Setup Instructions

### 1. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Superuser
```bash
python manage.py createsuperuser
```

### 5. Run Development Server
```bash
python manage.py runserver
```

Server will be available at `http://localhost:8000`

---

## API Endpoints

### Authentication
- `POST /api/auth/token/` - Get access & refresh tokens (username + password)
- `POST /api/auth/token/refresh/` - Refresh access token
- `POST /api/users/register/` - Register new user
- `POST /api/users/login/` - Login (alternative)
- `GET /api/users/me/` - Get current user info

### Users
- `GET /api/users/` - List all users (Manager/Admin only)
- `GET /api/users/{id}/` - Get user details
- `GET /api/users/by_role/?role=manager` - Filter users by role
- `DELETE /api/users/{id}/` - Delete user (Admin only)

### Tasks
- `GET /api/tasks/` - List tasks (filtered by role)
- `POST /api/tasks/` - Create task
- `GET /api/tasks/{id}/` - Get task details
- `PUT /api/tasks/{id}/` - Update task
- `PATCH /api/tasks/{id}/` - Partial update
- `DELETE /api/tasks/{id}/` - Delete task
- `PATCH /api/tasks/{id}/assign/` - Assign task to user (Manager/Admin)
- `PATCH /api/tasks/{id}/change_status/` - Change task status
- `GET /api/tasks/by_status/?status=todo` - Filter by status
- `GET /api/tasks/by_priority/?priority=high` - Filter by priority
- `GET /api/tasks/my_tasks/` - Tasks assigned to me
- `GET /api/tasks/created_by_me/` - Tasks I created

---

## Admin Panel
Access Django admin at `http://localhost:8000/admin/`

---

## User Roles
- **Admin**: Full access to all tasks and users
- **Manager**: Can create tasks, assign tasks, approve workflows
- **User**: Can create and view own tasks, update assigned tasks

---

## Database Models

### CustomUser
- Extends Django User model
- `role`: admin, manager, or user
- `username`, `email`, `password` (hashed)
- `first_name`, `last_name`

### Task
- `title`, `description`
- `created_by` (ForeignKey to User)
- `assigned_to` (ForeignKey to User, nullable)
- `status`: todo, in_progress, pending_approval, approved, rejected, done
- `priority`: low, medium, high
- `created_at`, `updated_at`

---

## Development Notes

- Uses JWT for authentication (SimpleJWT)
- SQLite for development (switch to PostgreSQL in production)
- CORS enabled for localhost:3000 (React frontend)
- Timestamps auto-managed (created_at, updated_at)
