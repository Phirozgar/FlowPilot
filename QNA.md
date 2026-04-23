# FlowPilot Enterprise - Examiner Q&A Guide

This document contains a set of potential technical questions and answers that an examining professor or academic review board might ask regarding the architecture, implementation, and logic of the FlowPilot project.

---

## Technical Questions & Architectural Defenses

### 1. How does the system handle session persistence and authentication securely without retaining memory on the server?
**Answer:** 
We implemented a stateless JWT (JSON Web Token) architecture. When a user authenticates, the backend signs and generates a credential token. The server does not keep a session ID in its memory (stateless). The client (React) stores this token locally. For every subsequent request, the React app attaches the token inside the `Authorization` HTTP header. 
**Key implementation locations:**
- **Backend:** `backend/config/settings.py` (JWT configuration parameters) and `backend/apps/users/views.py` (Validation of credentials inside `login()` method).
- **Frontend:** `frontend/src/context/AppContext.js` (The generic Axios interceptor that injects the Token globally into every outgoing network request securely).

### 2. Can you point to where form filling and payload validation is occurring in the software? Are you relying purely on the client?
**Answer:**
We utilize a strict **dual-validation constraint** paradigm (validating on both the UI and the Backend) to maximize user experience while guaranteeing database integrity against malicious injections.
- **Frontend (Client-side):** Provides immediate interactive feedback so the user doesn't have to wait for server round-trips.
  - *Filepath:* `frontend/src/pages/CreateTask.js` checks component state forms dynamically to ensure required constraints (like task titles and priority) exist.
  - *Filepath:* `frontend/src/pages/Login.js` / `Register.js` manages local typing and interactive forms.
- **Backend (Server-side):** The ultimate source of truth preventing API manipulation. We use Django REST Framework (DRF) serializers to sanitize request data.
  - *Filepath:* `backend/apps/users/serializers.py` contains `RegisterSerializer`. We override the `validate()` function to ensure security constraints like `password == password_confirmation` are strictly mapped before saving to the DB.
  - *Filepath:* `backend/apps/tasks/serializers.py` handles form mapping when pushing the actual Ticket into the SQL database.

### 3. Since users can join multiple isolated teams simultaneously, how did you prevent database queries from "bleeding" data (tickets, chats) into the wrong team UI?
**Answer:**
We completely decoupled the idea of a simple `User.team` lookup. Instead, we created an intermediary relational table called `UserTeamMembership`. When executing queries, we algorithmically scope the data exclusively to the memberships the requested user possesses. 
- *Filepath:* `backend/apps/tasks/services.py` hosts the `TaskQueryService.get_user_visible_tasks()` method. This explicitly parses active ticket constraints utilizing complex Django `Q()` querying constraints to isolate access strictly. If a user is removed from a team, the `UserTeamMembership` is destroyed, and the backend data access collapses sequentially, safeguarding the data natively.

### 4. What happens when a user attempts to bypass the hierarchical chain and immediately approve a task intended for a higher role?
**Answer:**
The system's pipeline dictates a strict integer-based leveling map (`Superadmin: 0`, `Intern: 4`). When a user triggers an approval, the `TicketPipelineService` actively compares the user's evaluated `role_level` corresponding to the current state of the ticket's `current_approver_level`. If the mathematical comparison rejects the operation because the operator holds an insufficient tier, a `PermissionDenied` error acts as a hard stop.
- *Filepath:* `backend/apps/tasks/services.py` (Within `TicketPipelineService.approve_task()`).

### 5. If your React architecture communicates over REST, how did you circumvent limitations regarding large data volumes (like a chat channel having thousands of users)?
**Answer:**
Typically, APIs implement offset or cursor pagination. While standard components paginated endpoints down to 10 entities out-of-the-box, we encountered local filtering discrepancies dynamically parsing team metrics on the front end. To preserve seamless UX across localized states (such as Team lists and Chats arrays dropping off unparsed elements), we globally disabled hard-capped DRF pagination in `backend/config/settings.py` for MVP deployment. In high-data production, we would reimplement rolling infinite-scroll cursors native to the UI's bounding box to load objects lazily.

### 6. Where is routing and overall path-authentication handled to prevent an external visitor from navigating directly into the Dashboard via URL?
**Answer:**
React Router implements a "Private Route" or conditional navigation intercept. When a user changes the URL path, the `App.js` umbrella evaluates if the central context `token` is fully valid. If not, the `<Navigate to="/login" />` hook violently intercepts the dom construction natively.
- *Filepath:* `frontend/src/App.js` manages the core wrapper components dictating layout rendering.
