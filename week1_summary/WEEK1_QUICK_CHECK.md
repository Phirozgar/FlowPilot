# Week 1 Quick Verification Commands

Copy and paste these commands to verify everything is working:

## 1. Check Requirements are Installed
```bash
cd /home/WP_B2/Desktop/sem6/OpsFlow/backend
pip list | grep -E "Django|djangorestframework|simplejwt"
```

**Expected Output**:
```
Django                    4.2.8
djangorestframework       3.14.0
djangorestframework-simplejwt  5.3.1
```

---

## 2. Check Custom User Model
```bash
grep -A 5 "class CustomUser" /home/WP_B2/Desktop/sem6/OpsFlow/backend/apps/users/models.py
```

**Expected Output** includes: `role` field with choices

---

## 3. Check JWT Configuration
```bash
grep -A 15 "SIMPLE_JWT" /home/WP_B2/Desktop/sem6/OpsFlow/backend/config/settings.py
```

**Expected Output** includes: ACCESS_TOKEN_LIFETIME, REFRESH_TOKEN_LIFETIME

---

## 4. Check JWT Endpoints in URLs
```bash
grep -E "token|TokenObtain" /home/WP_B2/Desktop/sem6/OpsFlow/backend/config/urls.py
```

**Expected Output**:
```
path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
```

---

## 5. Check Login Endpoint
```bash
grep -A 20 "def login" /home/WP_B2/Desktop/sem6/OpsFlow/backend/apps/users/views.py | head -25
```

**Expected Output**: Should include token generation with `RefreshToken.for_user(user)`

---

## 6. Run Migrations and Start Server
```bash
cd /home/WP_B2/Desktop/sem6/OpsFlow/backend
python manage.py migrate
python manage.py runserver
```

**Expected Output**:
```
Starting development server at http://127.0.0.1:8000/
```

---

## 7. Test Login Endpoint (in another terminal)
```bash
# First register
curl -X POST http://localhost:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"weektest","email":"test@test.com","password":"TestPass123","password2":"TestPass123","first_name":"Test","last_name":"User"}'

# Then login
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"weektest","password":"TestPass123"}'
```

**Expected Output**: JSON with tokens and user data

---

## ✅ All Components Checklist

- [ ] Django 4.2.8 installed
- [ ] DRF installed
- [ ] SimpleJWT installed
- [ ] Custom User model exists with role field
- [ ] JWT config in settings.py
- [ ] Token endpoints in urls.py
- [ ] Login endpoint returns tokens
- [ ] Migrations applied
- [ ] Server starts without errors
- [ ] Can register and login successfully

---

**Status**: 100% COMPLETE ✅
