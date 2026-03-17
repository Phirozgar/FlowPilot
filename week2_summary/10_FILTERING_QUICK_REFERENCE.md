# Task API - Filtering & Pagination Quick Reference

Quick lookup for common filtering and pagination patterns.

---

## Quick Filter Examples

### By Status
```bash
# Approved tasks
GET /api/tasks/?status=approved

# In review tasks
GET /api/tasks/?status=in_review

# Rejected tasks
GET /api/tasks/?status=rejected
```

### By Assigned User
```bash
# Tasks assigned to user ID 5
GET /api/tasks/?assigned_to=5

# Tasks assigned to john_doe
GET /api/tasks/?assigned_to=john_doe
```

### By Creator
```bash
# Tasks created by user ID 3
GET /api/tasks/?created_by=3

# Tasks created by alice_smith
GET /api/tasks/?created_by=alice_smith
```

### By Approval Step
```bash
# Pending manager approval (step 1)
GET /api/tasks/?approval_step=1

# Pending admin approval (step 2)
GET /api/tasks/?approval_step=2
```

### Search
```bash
# Search for "login" in title or description
GET /api/tasks/?search=login

# Search for "bug fix"
GET /api/tasks/?search=bug+fix
```

---

## Pagination

```bash
# Page 1 (default)
GET /api/tasks/?page=1

# Page 2
GET /api/tasks/?page=2

# Page 3
GET /api/tasks/?page=3
```

---

## Ordering

```bash
# Newest first (default)
GET /api/tasks/?ordering=-created_at

# Oldest first
GET /api/tasks/?ordering=created_at

# Most recently updated first
GET /api/tasks/?ordering=-updated_at

# By status (alphabetical)
GET /api/tasks/?ordering=status
```

---

## Combined Examples

### Example 1: Manager's pending approvals
```bash
GET /api/tasks/?status=in_review&approval_step=1&ordering=-created_at
```

### Example 2: User's own tasks, approved only
```bash
GET /api/tasks/?created_by=user_id&status=approved
```

### Example 3: Search and filter
```bash
GET /api/tasks/?search=database&status=approved
```

### Example 4: Assigned tasks, pending approval
```bash
GET /api/tasks/?assigned_to=5&status=in_review&approval_step=2
```

### Example 5: Multiple filters with pagination
```bash
GET /api/tasks/?status=in_review&approval_step=1&page=2&ordering=-updated_at
```

---

## Query String Cheat Sheet

| Purpose | Query String |
|---------|--------------|
| All approved tasks | `?status=approved` |
| My created tasks | `?created_by=my_user_id` |
| Tasks for me | `?assigned_to=my_user_id` |
| Pending approval | `?approval_step=1&status=in_review` |
| Admin approval | `?approval_step=2&status=in_review` |
| Latest first | `?ordering=-created_at` |
| Oldest first | `?ordering=created_at` |
| Search tasks | `?search=keyword` |
| Page 2 | `?page=2` |

---

## Response Structure

All list endpoints return:

```json
{
  "count": 45,
  "next": "http://localhost:8000/api/tasks/?page=2",
  "previous": null,
  "results": [
    { "id": 1, "title": "Task 1", ... },
    { "id": 2, "title": "Task 2", ... },
    ...
  ]
}
```

| Field | Meaning |
|-------|---------|
| `count` | Total number of items (across all pages) |
| `next` | URL to next page (null if none) |
| `previous` | URL to previous page (null if first) |
| `results` | Items on current page (max 10) |

---

## cURL Examples

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' \
  -s | jq -r '.access')

# List all tasks
curl http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer $TOKEN" | jq

# Filter by status
curl "http://localhost:8000/api/tasks/?status=approved" \
  -H "Authorization: Bearer $TOKEN" | jq

# Multiple filters
curl "http://localhost:8000/api/tasks/?status=in_review&approval_step=1" \
  -H "Authorization: Bearer $TOKEN" | jq

# With pagination
curl "http://localhost:8000/api/tasks/?status=approved&page=2" \
  -H "Authorization: Bearer $TOKEN" | jq

# Search
curl "http://localhost:8000/api/tasks/?search=login" \
  -H "Authorization: Bearer $TOKEN" | jq

# Order and filter
curl "http://localhost:8000/api/tasks/?status=in_review&ordering=-created_at" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Common Patterns

### Manager Dashboard
Show all pending approvals at step 1, newest first:
```
?status=in_review&approval_step=1&ordering=-created_at
```

### User Dashboard
Show user's created tasks:
```
?created_by=current_user_id
```

### Task Queue
Show tasks pending admin approval:
```
?approval_step=2&status=in_review
```

### Search Results
Search with pagination:
```
?search=keyword&page=1&ordering=-created_at
```

### Completed Tasks
Show all approved/rejected tasks:
```
?status=approved&ordering=-updated_at&page=1
```

---

## Role-Based Filtering

| Role | What They See |
|------|---------------|
| **USER** | Tasks they created OR assigned to them |
| **MANAGER** | All tasks in system |
| **ADMIN** | All tasks in system |

**Note:** Filters are applied AFTER role-based filtering.

---

## Valid Filter Values

### Status
- `pending`
- `in_review`
- `approved`
- `rejected`

### Approval Step
- `1` (manager approval)
- `2` (admin approval)

### Assigned To / Created By
- User ID (integer): `?assigned_to=5`
- Username (string): `?assigned_to=john_doe`

### Ordering
- `created_at` (oldest first)
- `-created_at` (newest first, default)
- `updated_at` (oldest update first)
- `-updated_at` (newest update first)
- `status` (alphabetical)
- `approval_step` (ascending)
- `-approval_step` (descending)

---

## Postman Collection Quick Commands

```
# Get all tasks
GET {{BASE_URL}}/api/tasks/

# Filter by status
GET {{BASE_URL}}/api/tasks/?status=approved

# Filter by creator
GET {{BASE_URL}}/api/tasks/?created_by={{USER_ID}}

# Paginate
GET {{BASE_URL}}/api/tasks/?page=2

# Multiple filters
GET {{BASE_URL}}/api/tasks/?status=in_review&approval_step=1&ordering=-created_at

# Search
GET {{BASE_URL}}/api/tasks/?search=bug

# Combined
GET {{BASE_URL}}/api/tasks/?created_by={{USER_ID}}&status=approved&page=1
```

---

## Performance Tips

1. **Use specific filters** to reduce result set size
2. **Use pagination** for large datasets
3. **Combine filters** for narrow results
4. **Search sparingly** - it scans all records
5. **Filter before ordering** for better performance

---

## Frontend Template

```javascript
// React/Vue filter and fetch function
async function fetchTasks(filters = {}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  
  const response = await fetch(`${API}/tasks/?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return await response.json();
}

// Usage examples
const approved = await fetchTasks({ status: 'approved' });
const pending = await fetchTasks({ approval_step: 1, status: 'in_review' });
const userTasks = await fetchTasks({ created_by: userId });
const search = await fetchTasks({ search: 'database', page: 1 });
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No results | Check filter values match your data |
| Wrong ordering | Verify field name is in `ordering_fields` |
| Search finds nothing | Try broader terms, search is case-sensitive |
| Pagination shows 0 | Increase page number or remove filters |
| 401 error | Refresh your JWT token |

---

**Last Updated:** March 17, 2026
**Status:** ✅ Complete & Tested
