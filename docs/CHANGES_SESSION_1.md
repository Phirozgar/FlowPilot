# FlowPilot — Session 1 Changes Summary
**Date:** 2026-04-20  
**Session:** Initial architecture overhaul — Task-based → Ticket-based hierarchical pipeline

---

## Backend Changes

### Team Management & Membership

| File | Change |
|------|--------|
| `apps/users/models.py` | Added `Team`, `UserTeamMembership`, `TeamJoinRequest` models |
| `apps/users/serializers.py` | Added `TeamSerializer`, `UserTeamMembershipSerializer`, `TeamJoinRequestSerializer`; added `all_teams` to `UserSerializer` |
| `apps/users/views.py` | Added `join`, `switch`, `my_teams`, `leave`, `pending_requests`, `approve_request`, `reject_request`, `my_join_requests` actions to `TeamViewSet` |
| `apps/users/admin.py` | Registered `Team`, `UserTeamMembership`, `TeamJoinRequest` |

**Key decisions:**
- All team joins require manager approval (`TeamJoinRequest` with `pending/approved/rejected` status)
- Users can belong to multiple teams via `UserTeamMembership`; one team is "active" at a time
- Privileged roles (superadmin, team_leader, senior_dev) can create new teams

### Ticket Workflow & Pipeline

| File | Change |
|------|--------|
| `apps/tasks/models.py` | Added `ticket_number` (auto-generated), `priority`, `current_approver_level`; renamed to `TicketSerializer` |
| `apps/tasks/serializers.py` | Added chronological `pipeline` field, auto-channel creation on ticket create |
| `apps/tasks/services.py` | Full `TicketPipelineService` (approve/reject/close/reopen), `TaskQueryService` with role-based visibility |
| `apps/tasks/views.py` | Added `approve`, `reject`, `close`, `reopen`, `awaiting_my_review` actions |

**Pipeline mechanics:**
- Intern submits → Junior Dev approves → Senior Dev → Team Leader → Superadmin → auto-closes
- `current_approver_level` decrements on each approval (higher role = lower number)

### Communication

| File | Change |
|------|--------|
| `apps/communication/views.py` | Added `ticket-channel` endpoint; fixed channel visibility to members only |
| `apps/calendar/views.py` | Added `today` endpoint for server-side date filtering |

---

## Frontend Changes

| Page | Change |
|------|--------|
| `App.js` | Added `TeamSwitcher`, profile card with `all_teams`, `refreshUser` in context |
| `Dashboard.js` | Leader join request notifications, Today's Schedule fix, layout overlap fix |
| `TicketDetail.js` | Pipeline visualization, edit modal, comment section auto-creates channel |
| `CreateTask.js` | Priority selector, field-level errors, team guard |
| `Workflows.js` | Role dropdown for steps instead of text input, step delete |
| `TeamPage.js` | Create team modal, leave team button, multi-team switcher, join form with role |

---

## Migrations
- `users 0002` — Added `TeamJoinRequest`
- `tasks 0002` — Added `ticket_number`, `priority`, `current_approver_level`
