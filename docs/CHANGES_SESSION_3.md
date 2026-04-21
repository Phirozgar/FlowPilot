# FlowPilot — Session 3 Changes Summary
**Date:** 2026-04-21  
**Session:** Frontend refinements, UI/UX polish, and Workflow features

---

## Issues Fixed

### Issue 1 — DOCS: Added Session 3 Changes
Created `docs/CHANGES_SESSION_3.md` to document the latest batched updates.

---

### Issue 2 — Stale team data on switch
**Problem:** `Dashboard`, `Tickets`, `Channels`, and `TeamPage` didn't fully hard-reload when switching teams, requiring a manual refresh.
**Fix:** Modified `App.js`, `Dashboard.js`, `Channels.js` `useEffect` hooks and dependencies. Component state clears and fully re-fetches whenever `currentUser?.team` changes.

---

### Issue 3 — Missing team member in chat/UI
**Problem:** Approving join requests updated the `UserTeamMembership` table, but didn't immediately sync the user into the `Channel` representing the Group Chat. Also `Channels.js` used a string-to-int comparison that occasionally failed.
**Fix:** 
- Updated `users/views.py` `approve_request` to locate the Group Chat and `members.add()` the user.
- Updated `Channels.js` to strictly parse and match `Number(u.team) === Number(currentUser.team)`.
- Updated backend `communication/views.py` `team_group` endpoint to accurately query members using `UserTeamMembership` instead of the legacy `user.team` FK whenever fetching the group channel.

---

### Issue 4 — Rename "Reporter" in Tickets Table
**Problem:** Column name "Reporter" was confusing.
**Fix:** Updated the string to `"Raised By"` in the table header of `Tickets.js`. 

---

### Issue 5 & 7 — Workflow Template Selection Errors & UX
**Problem:** Setting "None (standard)" template presented a huge frontend error stack when creating a ticket because of failing `POST /api/workflows/instances/`. If fetching templates completely failed, it hard-locked the form payload structure.
**Fix:** 
- Totally revamped the Workflow selection UI in `CreateTask.js`. Built-in templates ("Standard" and "Direct") bypass standard DB insertion and define `direct` boolean routing natively.
- Added graceful failure: if DB workflow templates cannot be fetched, it defaults to showing only built-in workflows and suppressing blocking errors.

---

### Issue 6 — Direct to Team Leader Workflow
**Problem:** Users needed a way to issue tickets directly to the highest tier without middle-management review. 
**Fix:** 
- Added a `direct: true/false` option on the ticket creation payload.
- In `tasks/serializers.py`, if `direct=True` is provided from the frontend, it hardcodes `current_approver_level` to `min(1, creator_level - 1)` (Level 1 = Team Leader).

---

### Issue 8 — Delete Own Unreviewed Tickets
**Problem:** Inability to recall or delete a mis-submitted ticket. 
**Fix:** 
- Created `TicketPipelineService.can_delete()`. A user is allowed to delete their ticket if they are the creator AND `current_approver_level` hasn't progressed past the initial tier AND `status === 'open'`. Team leaders have global delete access.
- Exposed `can_delete` on the UI frontend via serializers. Added narrow delete button on `Tickets.js` list view rows and a designated action on `TicketDetail`.

---

### Issue 9 & 10 — Multi-team Data Isolation 
**Problem:** After leaving a team, users were still able to see that team's tickets. 
**Fix:** 
- Updated `TaskQueryService.get_user_visible_tasks()`. All tickets queried are now inherently constrained by `Q(created_by__team_id__in=member_team_ids) | Q(assigned_to__team_id__in=member_team_ids)`. 
- Since leaving a team breaks the `UserTeamMembership` row, visibility instantly vanishes on the frontend.
- When re-joining (Issue 10), because `membership` revives, the queries inherently return the previous data naturally, fulfilling the requirement.
