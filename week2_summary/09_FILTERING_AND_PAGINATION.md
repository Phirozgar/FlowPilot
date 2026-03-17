# Task API - Filtering & Pagination Guide

Complete guide for filtering and paginating Task API results using Django REST Framework best practices.

---

## Overview

The Task list endpoint now supports:
- **Filtering** by status, assigned_to, created_by, and approval_step
- **Pagination** with configurable page size
- **Ordering** by created_at, updated_at, status
- **Search** by title and description

---

## Implementation Details

### Configuration

**Location:** `backend/apps/tasks/views.py` (lines 10-24)

```python
class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'status', 'approval_step']
    ordering = ['-created_at']  # Default: newest first
```

**Global Pagination:** `config/settings.py`

```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}
```

### Filtering Logic

**Location:** `backend/apps/tasks/views.py` (lines 28-75)

```python
def get_queryset(self):
    """
    Apply role-based filtering + query parameter filters
    """
    # Role-based filtering
    if user.is_manager():
        queryset = Task.objects.all()
    else:
        queryset = Task.objects.filter(
            Q(created_by=user) | Q(assigned_to=user)
        )
    
    # Query parameter filters
    if status_param:
        queryset = queryset.filter(status=status_param)
    if assigned_to_param:
        queryset = queryset.filter(
            Q(assigned_to__id=assigned_to_param) | 
            Q(assigned_to__username=assigned_to_param)
        )
    if created_by_param:
        queryset = queryset.filter(
            Q(created_by__id=created_by_param) | 
            Q(created_by__username=created_by_param)
        )
    if approval_step_param:
        queryset = queryset.filter(approval_step=approval_step_param)
    
    return queryset
```

---

## API Endpoints

### List Tasks with Filtering

```http
GET /api/tasks/?[filters]&[ordering]&[page]
Authorization: Bearer <JWT_TOKEN>
```

---

## Filtering Options

### 1. Filter by Status

```http
GET /api/tasks/?status=approved
GET /api/tasks/?status=in_review
GET /api/tasks/?status=rejected
GET /api/tasks/?status=pending
```

**Valid Status Values:**
- `pending` - Task created but not yet in review
- `in_review` - Task under approval
- `approved` - Task approved
- `rejected` - Task rejected

**Example Response:**

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "API Integration",
      "created_by_username": "user1",
      "assigned_to_username": "manager1",
      "status": "approved",
      "approval_step": 2,
      "created_at": "2026-03-17T10:30:00Z"
    },
    {
      "id": 3,
      "title": "Database Migration",
      "created_by_username": "user2",
      "assigned_to_username": "manager1",
      "status": "approved",
      "approval_step": 2,
      "created_at": "2026-03-17T09:15:00Z"
    }
  ]
}
```

### 2. Filter by Assigned To

Supports both user ID and username:

```http
GET /api/tasks/?assigned_to=5
GET /api/tasks/?assigned_to=john_doe
```

**Example:** Show tasks assigned to manager with ID 5

```bash
curl -X GET "http://localhost:8000/api/tasks/?assigned_to=5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3. Filter by Created By

Supports both user ID and username:

```http
GET /api/tasks/?created_by=3
GET /api/tasks/?created_by=alice_smith
```

**Example:** Show tasks created by user with ID 3

```bash
curl -X GET "http://localhost:8000/api/tasks/?created_by=3" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 4. Filter by Approval Step

```http
GET /api/tasks/?approval_step=1
GET /api/tasks/?approval_step=2
```

**Valid Values:**
- `1` - Pending manager approval
- `2` - Pending admin approval

### 5. Combine Multiple Filters

Combine filters with `&` operator:

```http
GET /api/tasks/?status=in_review&approval_step=1&assigned_to=5
GET /api/tasks/?created_by=user1&status=approved
GET /api/tasks/?assigned_to=john_doe&approval_step=2
```

**Example:** Tasks created by user1, assigned to manager, pending approval

```bash
curl -X GET "http://localhost:8000/api/tasks/?created_by=user1&assigned_to=5&status=in_review" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Pagination

### Default Pagination

The API returns **10 items per page** by default.

**Request:**

```http
GET /api/tasks/
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "count": 45,
  "next": "http://localhost:8000/api/tasks/?page=2",
  "previous": null,
  "results": [
    { ... task 1 ... },
    { ... task 2 ... },
    ...
    { ... task 10 ... }
  ]
}
```

### Navigate Pages

```http
GET /api/tasks/?page=1
GET /api/tasks/?page=2
GET /api/tasks/?page=3
```

**Example:**

```bash
# First page
curl "http://localhost:8000/api/tasks/?page=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.count'
# Output: 45

# Third page
curl "http://localhost:8000/api/tasks/?page=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.results | length'
# Output: 10
```

### Pagination Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of tasks |
| `next` | string | URL to next page (null if no more pages) |
| `previous` | string | URL to previous page (null if first page) |
| `results` | array | Task objects for current page |

---

## Ordering

### Order by created_at (Default)

Tasks are returned newest first by default:

```http
GET /api/tasks/  # Default: -created_at (newest first)
```

### Explicitly Order

```http
GET /api/tasks/?ordering=-created_at
GET /api/tasks/?ordering=created_at
GET /api/tasks/?ordering=-updated_at
GET /api/tasks/?ordering=updated_at
GET /api/tasks/?ordering=status
GET /api/tasks/?ordering=-approval_step
```

**Example:** Show oldest tasks first

```bash
curl "http://localhost:8000/api/tasks/?ordering=created_at" \
  -H "Authorization: Bearer $TOKEN" | jq '.results[0:3] | map(.title)'
```

### Valid Ordering Fields

| Field | Description |
|-------|-------------|
| `created_at` | Task creation date |
| `-created_at` | Reverse: newest first (default) |
| `updated_at` | Last update date |
| `-updated_at` | Reverse: most recently updated first |
| `status` | Task status (alphabetical) |
| `-status` | Reverse status order |
| `approval_step` | Approval step (1 or 2) |
| `-approval_step` | Reverse step order |

---

## Search

Search by title or description:

```http
GET /api/tasks/?search=login
GET /api/tasks/?search=database
```

**Example:** Search for tasks with "bug" in title or description

```bash
curl "http://localhost:8000/api/tasks/?search=bug" \
  -H "Authorization: Bearer $TOKEN" | jq '.results | map(.title)'
```

---

## Combined Examples

### Example 1: Approved tasks assigned to manager, newest first

```bash
curl "http://localhost:8000/api/tasks/?status=approved&assigned_to=5&ordering=-created_at" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Example 2: Pending approval tasks created by specific user, page 2

```bash
curl "http://localhost:8000/api/tasks/?created_by=user1&status=in_review&page=2" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Example 3: Tasks at approval step 2, search for "database"

```bash
curl "http://localhost:8000/api/tasks/?approval_step=2&search=database" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Example 4: Rejected tasks, ordered by most recently updated

```bash
curl "http://localhost:8000/api/tasks/?status=rejected&ordering=-updated_at" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Frontend Integration

### React Example

```javascript
// Fetch tasks with filters
const fetchTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
  if (filters.created_by) params.append('created_by', filters.created_by);
  if (filters.approval_step) params.append('approval_step', filters.approval_step);
  if (filters.search) params.append('search', filters.search);
  if (filters.ordering) params.append('ordering', filters.ordering);
  if (filters.page) params.append('page', filters.page);
  
  const response = await fetch(`${API_URL}/tasks/?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// Usage
const approved = await fetchTasks({ status: 'approved', page: 1 });
const pending = await fetchTasks({ status: 'in_review', approval_step: 1 });
const myTasks = await fetchTasks({ created_by: userId });
const search = await fetchTasks({ search: 'bug fix', ordering: '-created_at' });
```

### Vue Example

```vue
<template>
  <div>
    <input v-model="filters.search" placeholder="Search tasks...">
    <select v-model="filters.status">
      <option value="">All Status</option>
      <option value="approved">Approved</option>
      <option value="in_review">In Review</option>
      <option value="rejected">Rejected</option>
    </select>
    
    <ul>
      <li v-for="task in tasks" :key="task.id">
        {{ task.title }} ({{ task.status }})
      </li>
    </ul>
    
    <button @click="previousPage" :disabled="!hasPrevious">Previous</button>
    <span>Page {{ currentPage }}</span>
    <button @click="nextPage" :disabled="!hasNext">Next</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      tasks: [],
      currentPage: 1,
      totalCount: 0,
      hasNext: false,
      hasPrevious: false,
      filters: { search: '', status: '', ordering: '-created_at' }
    };
  },
  methods: {
    async fetchTasks() {
      const params = new URLSearchParams({
        page: this.currentPage,
        ...this.filters
      });
      const response = await fetch(`${API_URL}/tasks/?${params}`, {
        headers: { 'Authorization': `Bearer ${this.$store.state.token}` }
      });
      const data = await response.json();
      this.tasks = data.results;
      this.totalCount = data.count;
      this.hasNext = data.next !== null;
      this.hasPrevious = data.previous !== null;
    },
    nextPage() {
      this.currentPage++;
      this.fetchTasks();
    },
    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.fetchTasks();
      }
    }
  },
  watch: {
    filters: {
      handler() {
        this.currentPage = 1;
        this.fetchTasks();
      },
      deep: true
    }
  },
  mounted() {
    this.fetchTasks();
  }
};
</script>
```

### Python Example

```python
import requests

# Setup
headers = {'Authorization': f'Bearer {token}'}
api_url = 'http://localhost:8000/api/tasks/'

# Simple list
response = requests.get(api_url, headers=headers)
tasks = response.json()

# Filter by status
response = requests.get(f'{api_url}?status=approved', headers=headers)
approved_tasks = response.json()

# Multiple filters
params = {
    'status': 'in_review',
    'approval_step': 1,
    'ordering': '-created_at',
    'page': 1
}
response = requests.get(api_url, params=params, headers=headers)
data = response.json()

# Access pagination
total_tasks = data['count']
next_page_url = data['next']
previous_page_url = data['previous']
tasks_on_page = data['results']

# Search
response = requests.get(f'{api_url}?search=database', headers=headers)
search_results = response.json()
```

---

## Query Parameters Reference

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `?status=approved` |
| `assigned_to` | integer/string | Filter by assigned user (ID or username) | `?assigned_to=5` or `?assigned_to=john` |
| `created_by` | integer/string | Filter by creator (ID or username) | `?created_by=3` or `?created_by=alice` |
| `approval_step` | integer | Filter by approval step | `?approval_step=1` |
| `search` | string | Search title and description | `?search=bug` |
| `ordering` | string | Sort results | `?ordering=-created_at` |
| `page` | integer | Pagination page number | `?page=2` |

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success - tasks returned |
| 401 | Unauthorized - missing/invalid token |
| 403 | Forbidden - user not authenticated |
| 404 | Not found |

---

## Performance Considerations

### Query Optimization

- Filters are applied after role-based filtering
- Database indexes on `status`, `assigned_to`, `created_by` improve performance
- Each page request performs 1-2 database queries (with proper indexing)

### Best Practices

1. **Use specific filters** when possible to reduce result set
2. **Combine filters** for narrow results
3. **Use pagination** for large result sets (don't load all tasks at once)
4. **Order by indexed fields** for better performance
5. **Use search sparingly** - it scans title and description

### Database Indexes

The Task model has indexes on:
- `status` - for quick filtering
- `assigned_to` - for user-specific queries
- `created_by` - for creator-specific queries
- `created_at` - for default ordering

---

## Common Use Cases

### 1. Manager Dashboard

Show all tasks pending approval (step 1):

```http
GET /api/tasks/?status=in_review&approval_step=1
```

### 2. User Dashboard

Show user's own tasks:

```http
GET /api/tasks/?created_by=current_user_id
```

### 3. Approval Queue

Show tasks for admin approval (step 2):

```http
GET /api/tasks/?approval_step=2&status=in_review
```

### 4. Completed Tasks

Show all completed tasks with pagination:

```http
GET /api/tasks/?status=approved&page=1
```

### 5. Task Search

Search for specific task by title:

```http
GET /api/tasks/?search=login+bug&ordering=-created_at
```

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/apps/tasks/views.py` | Added filtering logic to `get_queryset()` method, configured `filter_backends`, `ordering_fields`, `search_fields` |

**No changes to:**
- URL configuration
- Models
- Serializers
- Migrations
- Settings (pagination already configured globally)

---

## Testing

### cURL Tests

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' -s | jq -r '.access')

# List all
curl "http://localhost:8000/api/tasks/" \
  -H "Authorization: Bearer $TOKEN" | jq '.count'

# Filter by status
curl "http://localhost:8000/api/tasks/?status=approved" \
  -H "Authorization: Bearer $TOKEN" | jq '.results | length'

# Filter and paginate
curl "http://localhost:8000/api/tasks/?status=in_review&page=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.next'

# Multiple filters
curl "http://localhost:8000/api/tasks/?status=approved&approval_step=2&ordering=-created_at" \
  -H "Authorization: Bearer $TOKEN" | jq '.results[0].title'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No results | Check if filters match your data; verify user permissions |
| Wrong page count | Ensure `page` parameter is valid integer |
| Ordering not working | Use valid field names from `ordering_fields` |
| Search returns nothing | Try broader search terms; search is case-sensitive |
| 401 Unauthorized | Token expired or missing; get new token |

---

## Summary

✅ **Filtering** by status, assigned_to, created_by, approval_step
✅ **Pagination** with configurable page size (default 10)
✅ **Ordering** by multiple fields
✅ **Search** by title and description
✅ **DRF Best Practices** - efficient, secure, well-documented
✅ **No Breaking Changes** - fully backward compatible
✅ **Production Ready** - tested and verified

---

**Status:** ✅ Complete and Tested
**Date:** March 17, 2026
**Implementation:** Django REST Framework
