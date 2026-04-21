# FlowPilot — Session 2 Changes Summary
**Date:** 2026-04-21  
**Session:** Bug fixes, admin role display, audit trail, team code format

---

## Issues Fixed

### Issue 0 — DOCS: Added `/docs/` folder
Created `docs/CHANGES_SESSION_1.md` and `docs/CHANGES_SESSION_2.md` for persistent change history.

---

### Issue 1 — Ticket Visibility Fix
**Problem:** Regular users were seeing all team members' tickets.  
**Fix:** `TaskQueryService.get_user_visible_tasks()` now returns ONLY:
- Tickets created by the user
- Tickets assigned to the user
- Tickets currently awaiting the user's approval role level

Team leaders continue to see all tickets in their team(s).

**File:** `backend/apps/tasks/services.py`

---

### Issue 2 — Team Members Not Updating After Join Approval
**Problem:** `TeamPage.fetchMembers()` filtered `/api/users/` by `u.team === currentUser.team` using loose equality — type mismatch between string and integer caused the filter to fail.  
**Fix:** Changed to `Number(u.team) === Number(currentUser.team)`. Added a manual "↻ Refresh Members" button. Added `setTimeout` after leave/switch to give backend time to commit.

**File:** `frontend/src/pages/TeamPage.js`

---

### Issue 3 — Team Invite Code Format (ABC-123)
**Problem:** Team codes used UUID format which was hard to share.  
**Fix:** `Team.save()` now auto-generates codes in `ABC-123` format (3 uppercase letters + dash + 3 digits, e.g. `ZQX-847`). Code input fields now auto-uppercase and use monospace font.

**Files:** `backend/apps/users/models.py`, `frontend/src/pages/TeamPage.js`, `frontend/src/App.js`

**Migration:** `users 0003` — altered `code` field on Team model.

---

### Issue 4 — Chat Still Accessible After Leaving Team
**Problem:** On `leave`, the user was only removed from `UserTeamMembership` but stayed in all chat channels.  
**Fix:** `leave` action now removes the user from:
- Channels with the team name in their title
- Task channels for tickets created by members of that team

**File:** `backend/apps/users/views.py`

---

### Issue 5 — "Rejoin After Rejection" Errors
**Problem:** `unique_together = ('user', 'team', 'status')` on `TeamJoinRequest` caused integrity errors when a user tried to rejoin after having a rejected request, because the old rejected record prevented creating a new pending record for the same user+team pair.  
**Fix:** Removed the DB-level `unique_together` constraint. Pending-request uniqueness is now enforced in the view: "you already have a pending request for this team."

**Files:** `backend/apps/users/models.py`, migration `users 0003`

---

### Issue 6 — CreateTask Still Failing
**Problem:** The `assigned_to_id` value could be `''` (empty string) or `'self'` which the DRF `PrimaryKeyRelatedField` couldn't handle, causing a 400 error.  
**Fix:** Frontend now resolves `assigned_to_id` before sending:
- `''` → omit field (null/unassigned)
- `'self'` → current user's ID
- Any other value → `parseInt()` cast

Also improved error parsing to handle `non_field_errors` DRF responses.

**File:** `frontend/src/pages/CreateTask.js`

---

### Issue 7 — Creator Not Auto-Added to New Team
**Problem:** When a user created a team, they were not added as a member.  
**Fix:** `TeamViewSet.perform_create()` now runs in `@transaction.atomic` and:
1. Creates the team
2. Creates a `UserTeamMembership` for the creator as `team_leader` (or `superadmin` if they are one)
3. Sets the team as the creator's active team

**File:** `backend/apps/users/views.py`

---

### Issue 8 — Approval Pipeline Displayed in Reverse Order
**Problem:** `get_pipeline()` in the serializer built the list with `range(creator_level-1, -1, -1)` (e.g. `[3,2,1,0]`) then called `.reverse()` which gave `[0,1,2,3]` — backwards (Superadmin first, Junior Dev last).  
**Fix:** Removed the `.reverse()` call. Range `[3,2,1,0]` is already the correct display order: first approver (Junior Dev) on the left, last approver (Superadmin) on the right.

**File:** `backend/apps/tasks/serializers.py`

---

### Issue 9 — Renamed "Reporter" to "Submitted By"
**Problem:** "Reporter" is ambiguous — doesn't clearly indicate the ticket creator.  
**Fix:** Changed the Details panel label from `Reporter` to `Submitted By`.

**File:** `frontend/src/pages/TicketDetail.js`

---

### Issue 10 — Ticket Audit Log (Activity Log)
**Problem:** No history of who did what on a ticket.  
**Fix:** Added `TicketLog` model with fields: `ticket`, `actor`, `action`, `note`, `timestamp`.  
Actions logged: `created`, `approved`, `rejected`, `closed`, `reopened`, `edited`.  
Serializer: `TicketLogSerializer` added to `TicketSerializer.logs` field.  
Frontend: New `AuditLog` component on `TicketDetail` page showing timestamped action history with icons.

**Files:**
- `backend/apps/tasks/models.py` — `TicketLog` model
- `backend/apps/tasks/serializers.py` — `TicketLogSerializer`, `logs` field
- `backend/apps/tasks/services.py` — `_log()` helper called in all pipeline actions
- `backend/apps/tasks/admin.py` — `TicketLogAdmin` + inline on `TaskAdmin`
- `frontend/src/pages/TicketDetail.js` — `AuditLog` component
- Migration: `tasks 0003`

---

### Issue 11 — Admin Shows as "Intern"
**Problem:** Django superusers have `role='intern'` by default. The `UserSerializer` returned the stored `role` field directly.  
**Fix:** `UserSerializer.get_role()` now checks `obj.is_superuser` and returns `'superadmin'` if true. `role_level` similarly returns `0` for superusers via `CustomUser.role_level` property.

**File:** `backend/apps/users/serializers.py`

---

### Issue 12 — DOCS: This file.
Created `docs/CHANGES_SESSION_2.md`.

---

## Migrations Applied
| App | Migration | Description |
|-----|-----------|-------------|
| `tasks` | `0003_add_ticket_log` | Created `TicketLog` model |
| `users` | `0003_fix_team_code_and_joinrequest` | ABC-123 team code, removed `unique_together` from `TeamJoinRequest` |
