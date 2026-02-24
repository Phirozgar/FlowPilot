# Week 1 Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                            │
│                   (Port: 3000)                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST
                              │ (CORS Enabled)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DJANGO REST API                                │
│                  (Port: 8000)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AUTHENTICATION LAYER                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  SimpleJWT Configuration                                │   │
│  │  - Access Token Lifetime: 1 hour                        │   │
│  │  - Refresh Token Lifetime: 7 days                       │   │
│  │  - Algorithm: HS256                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API ENDPOINTS                              │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Auth Endpoints:                                        │   │
│  │  • POST /api/auth/token/          - Get tokens         │   │
│  │  • POST /api/auth/token/refresh/  - Refresh token      │   │
│  │                                                          │   │
│  │  User Endpoints:                                        │   │
│  │  • POST   /api/users/register/    - Register user      │   │
│  │  • POST   /api/users/login/       - Login (+ tokens)   │   │
│  │  • GET    /api/users/me/          - Current user       │   │
│  │  • GET    /api/users/             - List users         │   │
│  │  • GET    /api/users/{id}/        - User detail        │   │
│  │  • GET    /api/users/by_role/     - Filter by role    │   │
│  │  • DELETE /api/users/{id}/        - Delete user        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         BUSINESS LOGIC (ViewSets & Serializers)         │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  UserViewSet (apps/users/views.py)                      │   │
│  │  ├─ register()    - Create new user                    │   │
│  │  ├─ login()       - Authenticate & return tokens       │   │
│  │  ├─ me()          - Get current user                   │   │
│  │  ├─ by_role()     - Filter by role                     │   │
│  │  └─ CRUD ops      - List, retrieve, update, delete    │   │
│  │                                                          │   │
│  │  Serializers (apps/users/serializers.py)               │   │
│  │  ├─ UserSerializer      - User data serialization      │   │
│  │  ├─ RegisterSerializer  - Registration validation      │   │
│  │  └─ LoginSerializer     - Login validation             │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DATA MODELS                                │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  CustomUser (apps/users/models.py)                      │   │
│  │  ├─ Extends: AbstractUser                              │   │
│  │  ├─ Fields:                                             │   │
│  │  │  ├─ username (inherited)                            │   │
│  │  │  ├─ email (inherited)                               │   │
│  │  │  ├─ password (inherited)                            │   │
│  │  │  ├─ first_name (inherited)                          │   │
│  │  │  ├─ last_name (inherited)                           │   │
│  │  │  ├─ is_active (inherited)                           │   │
│  │  │  └─ role (custom) - Choices:                        │   │
│  │  │     • admin   (Full system access)                  │   │
│  │  │     • manager (Team management access)              │   │
│  │  │     • user    (Basic user access)                   │   │
│  │  ├─ Methods:                                            │   │
│  │  │  ├─ is_admin()      - Check admin status            │   │
│  │  │  ├─ is_manager()    - Check manager+ status         │   │
│  │  │  └─ is_regular_user() - Check user status           │   │
│  │  └─ Admin: CustomUserAdmin (fully configured)          │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQLite ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (SQLite)                           │
│                     (db.sqlite3)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  • auth_user (inherited by CustomUser)                          │
│  • users_customuser (role field)                                │
│  • rest_framework_simplejwt_tokenblacklist (if enabled)         │
│  • django_session (session management)                           │
│  • ...other Django tables...                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Diagram

### Registration Flow
```
Client                    API                 Database
  │                        │                      │
  ├─ POST /register ──────▶│                      │
  │   (username,           │                      │
  │    password, etc)      │                      │
  │                        ├─ Validate data      │
  │                        │                      │
  │                        ├─ Hash password      │
  │                        │                      │
  │                        ├─ Create user ──────▶│
  │                        │   (role=user)       │
  │                        │◀─ User created ─────┤
  │                        │                      │
  │◀─ 201 Created ────────┤                      │
  │   {"message": ...}     │                      │
```

### Login Flow
```
Client                    API                 Database
  │                        │                      │
  ├─ POST /login ────────▶│                      │
  │   (username,           │                      │
  │    password)           │                      │
  │                        ├─ Query user ──────▶│
  │                        │◀─ User found ──────┤
  │                        │                      │
  │                        ├─ Verify password    │
  │                        │                      │
  │                        ├─ Generate tokens:   │
  │                        │   - Access token    │
  │                        │   - Refresh token   │
  │                        │                      │
  │◀─ 200 OK ────────────┤                      │
  │   { "tokens": {...},  │                      │
  │     "user": {...} }   │                      │
```

### Authenticated Request Flow
```
Client                    API                 Middleware
  │                        │                      │
  ├─ GET /me ────────────▶│                      │
  │ Authorization: Bearer │                      │
  │ <access_token>        │                      │
  │                        ├─ Check JWT token ──▶│
  │                        │   (validity, exp)   │
  │                        │◀─ Token valid ──────┤
  │                        │                      │
  │                        ├─ Get user data      │
  │                        │                      │
  │◀─ 200 OK ────────────┤                      │
  │   { "user": {...} }   │                      │
```

---

## Permission Model

```
┌─────────────────────────────────────────┐
│           ROLE HIERARCHY                │
├─────────────────────────────────────────┤
│                                         │
│    ┌──────────┐                         │
│    │  ADMIN   │  (Full Access)          │
│    │ (admin)  │  • Can delete users     │
│    │          │  • Can view all users   │
│    │          │  • Can assign roles    │
│    └────┬─────┘                         │
│         │                               │
│    ┌────▼─────┐                         │
│    │ MANAGER  │  (Team Mgmt)            │
│    │(manager) │  • Can view users       │
│    │          │  • Can assign tasks    │
│    └────┬─────┘                         │
│         │                               │
│    ┌────▼─────┐                         │
│    │   USER   │  (Basic Access)         │
│    │ (user)   │  • Can view own data   │
│    │          │  • Can update profile  │
│    └──────────┘                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Configuration Summary

| Component | Value | Location |
|-----------|-------|----------|
| **Framework** | Django 4.2.8 | settings.py |
| **REST API** | DRF 3.14.0 | settings.py |
| **Authentication** | JWT (SimpleJWT) | settings.py |
| **Database** | SQLite3 | settings.py#DATABASES |
| **Access Token TTL** | 1 hour | settings.py#SIMPLE_JWT |
| **Refresh Token TTL** | 7 days | settings.py#SIMPLE_JWT |
| **Algorithm** | HS256 | settings.py#SIMPLE_JWT |
| **CORS Origins** | localhost:3000, 8000 | settings.py#CORS |
| **Custom User Model** | users.CustomUser | settings.py#AUTH_USER_MODEL |

---

## Key Integration Points

### For Frontend Integration
1. **Register**: POST to `/api/users/register/`
2. **Login**: POST to `/api/users/login/` (returns access + refresh tokens)
3. **Authenticated Requests**: Add `Authorization: Bearer <access_token>` header
4. **Token Refresh**: POST to `/api/auth/token/refresh/` with refresh token
5. **Get Current User**: GET `/api/users/me/` with bearer token

### For Admin Panel
- Access at: `/admin/`
- Login with superuser credentials
- Manage users with role filtering
- View user details including roles

---

## File Structure

```
backend/
├── config/
│   ├── settings.py         ✅ JWT & DRF config
│   ├── urls.py             ✅ Token endpoints
│   └── wsgi.py
├── apps/
│   └── users/
│       ├── models.py       ✅ CustomUser model
│       ├── views.py        ✅ Login & register endpoints
│       ├── serializers.py  ✅ Data validation
│       ├── urls.py         ✅ User routes
│       ├── admin.py        ✅ Admin config
│       └── migrations/
└── utils/
    └── permissions.py      (Ready for custom permissions)
```

---

**Status**: Week 1 Architecture Complete ✅
