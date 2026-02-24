# Week 1 - Backend Foundation: Verification Guide

## ✅ Completion Status: 100%

All requirements for Week 1 - Backend Foundation have been successfully implemented and enhanced.

---

## What Has Been Completed

### 1. ✅ Django Project Setup Commands
- **Location**: `/backend/` 
- **Status**: Project structure is fully initialized
- **Configuration**: 
  - SQLite database (db.sqlite3)
  - Django 4.2.8
  - DRF 3.14.0
  - All apps registered in INSTALLED_APPS

### 2. ✅ Required Packages
- **File**: [requirements.txt](backend/requirements.txt)
- **Installed**:
  - `Django==4.2.8`
  - `djangorestframework==3.14.0`
  - `djangorestframework-simplejwt==5.3.1`
  - `django-cors-headers==4.3.1`
  - `python-dotenv==1.0.0`
  - `Pillow==10.1.0`

### 3. ✅ settings.py Configuration
- **File**: [config/settings.py](backend/config/settings.py)
- **Configured**:
  - REST Framework with JWT authentication
  - CORS settings for frontend integration
  - Custom User model as AUTH_USER_MODEL
  - JWT token lifetime settings (1 hour access, 7 days refresh)

### 4. ✅ Custom User Model with Role Field
- **File**: [apps/users/models.py](backend/apps/users/models.py)
- **Features**:
  - Extends AbstractUser
  - Role choices: 'admin', 'manager', 'user'
  - Default role: 'user'
  - Helper methods: `is_admin()`, `is_manager()`, `is_regular_user()`
  - Admin configuration with role field display

### 5. ✅ JWT Authentication Setup
- **Configuration in**: [config/settings.py](backend/config/settings.py#L110-L130)
- **Features**:
  - Token Obtain Pair endpoint: `/api/auth/token/`
  - Token Refresh endpoint: `/api/auth/token/refresh/`
  - Access token lifetime: 1 hour
  - Refresh token lifetime: 7 days
  - Algorithm: HS256

### 6. ✅ Basic Login Endpoint (ENHANCED)
- **File**: [apps/users/views.py](backend/apps/users/views.py)
- **Enhanced Features**:
  - Returns JWT tokens (access + refresh)
  - Returns authenticated user data
  - Validates credentials
  - Error handling for invalid credentials

---

## How to Verify Everything is Working

### Step 1: Apply Database Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

**What to check**: 
- No errors during migration
- `db.sqlite3` is updated

### Step 2: Create a Superuser (Optional, for Admin Panel)
```bash
python manage.py createsuperuser
# Follow the prompts
```

### Step 3: Start the Development Server
```bash
python manage.py runserver
```

**Expected output**:
```
Starting development server at http://127.0.0.1:8000/
```

### Step 4: Test the API Endpoints

#### Test 1: Register a New User
**Request**:
```bash
curl -X POST http://localhost:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123",
    "password2": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Expected Response** (201 Created):
```json
{
  "message": "User registered successfully"
}
```

#### Test 2: Login with Credentials
**Request**:
```bash
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

#### Test 3: Get Current User (Authenticated)
**Request**:
```bash
curl -X GET http://localhost:8000/api/users/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user"
}
```

#### Test 4: Refresh Token
**Request**:
```bash
curl -X POST http://localhost:8000/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Step 5: Verify File Structure
```bash
cd backend
find . -type f -name "*.py" | grep -E "(models|views|serializers|urls|settings)" | sort
```

**Expected files to exist**:
- ✅ config/settings.py
- ✅ config/urls.py
- ✅ apps/users/models.py
- ✅ apps/users/views.py
- ✅ apps/users/serializers.py
- ✅ apps/users/urls.py
- ✅ apps/users/admin.py
- ✅ apps/users/migrations/0001_initial.py

---

## Quick Verification Checklist

Use this checklist to verify all components are working:

- [ ] Install requirements: `pip install -r requirements.txt`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Start server: `python manage.py runserver`
- [ ] Register a user: POST `/api/users/register/`
- [ ] Login and get tokens: POST `/api/users/login/`
- [ ] Get current user: GET `/api/users/me/` (with Bearer token)
- [ ] Refresh token: POST `/api/auth/token/refresh/`
- [ ] Access admin panel: http://localhost:8000/admin/
- [ ] Check role-based access: Try listing users (only managers/admins can)

---

## Key Endpoints Summary

| Method | Endpoint | Authentication | Purpose |
|--------|----------|-----------------|---------|
| POST | `/api/users/register/` | None | Register new user |
| POST | `/api/users/login/` | None | Login & get tokens |
| GET | `/api/users/me/` | Token Required | Get current user |
| GET | `/api/users/` | Token Required | List all users (managers only) |
| GET | `/api/users/{id}/` | Token Required | Get specific user |
| POST | `/api/auth/token/` | None | Get tokens (alternative login) |
| POST | `/api/auth/token/refresh/` | None | Refresh access token |

---

## Environment Setup (If Fresh Install)

If you're setting up from scratch, follow these steps:

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Create superuser** (optional):
   ```bash
   python manage.py createsuperuser
   ```

4. **Start development server**:
   ```bash
   python manage.py runserver
   ```

5. **Test endpoints using curl or Postman**

---

## Notes

- The Custom User model is fully integrated as the AUTH_USER_MODEL
- JWT tokens are automatically generated on login
- Role-based permissions are implemented and working
- CORS is configured for frontend at localhost:3000
- Admin interface is fully configured with role filtering

---

**Week 1 - Backend Foundation: ✅ COMPLETE**

The backend is ready for Week 2 tasks. All authentication and user management foundations are in place.
