▶️ Final exact startup flow
1) Open terminal A for backend
cd "C:\Users\Admin\OneDrive\Desktop\Projects\FlowPilot-WEB"
.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt    # one-time if required
cd backend
python manage.py migrate
python manage.py runserver

Then verify:

http://127.0.0.1:8000/api/tasks/
http://127.0.0.1:8000/api/users/login/ (post)

------------------------------------------------------------------------------
2) Open terminal B for frontend
cd "C:\Users\Admin\OneDrive\Desktop\Projects\FlowPilot-WEB\frontend"
npm install                # one-time
npm run build              # verify
npm start

Then verify:

http://localhost:3000 (React SPA)
login/register works and calls http://localhost:8000/api/users/*

------------------------------------------------------------------------------

# FlowPilot Enterprise
**Advanced Hierarchical Workflow & Communication System**

---

## 1. Abstract Summary

FlowPilot Enterprise is a robust, full-stack workflow management and team collaboration system designed to tackle the complexities of multi-tiered organizational environments. It fundamentally reinvents issue tracking by binding tasks strictly to a hierarchical, role-based pipeline (e.g., Intern → Junior → Senior → Team Leader → Superadmin). Beyond tracking tasks, FlowPilot natively ties context-specific, real-time communication channels and calendar schedules directly to those workflows. By emphasizing strict data-isolation via multi-team memberships, dynamic pipeline templates (such as Direct-to-Leader bypasses), and a centralized dashboard, FlowPilot bridges the gap between ticketing, communication, and management.

---

## 2. Introduction to Problem Statement Solved by our Project

Modern engineering and corporate teams struggle with fragmented operations. Critical operations are split across disparate tools—Slack/Teams for chat, Jira/Linear for task management, and Google Calendar for scheduling. When junior members need approval on an artifact or pipeline ticket, the context is often lost in translation across these disconnected platforms. Managers struggle to piece together the history of a ticket, its isolated discussion, and its deadlines. FlowPilot solves this fragmentation by explicitly anchoring a unified chat interface and scheduling tools directly to a formalized, role-enforced workflow pipeline within a single pane of glass.

---

## 3. Related Work / Products

- **Atlassian Jira / Trello:** While powerful and customizable for agile planning, Jira is notoriously heavy, and Trello is relatively flat and informal. Neither natively enforce absolute tiered organizational roles without heavy setup, and third-party plugins are required to bridge communications.
- **Linear:** Excellent for fast-paced bug tracking and software issues, but heavily prioritizes individual task claiming over strict, multi-layer administrative approval processes.
- **Slack / MS Teams:** Dedicated purely to communication, requiring webhook bridges and bot configurations to interoperate with workflow systems. Context switching remains high.
- **ServiceNow:** Designed for enterprise IT service management involving strict tiers, but can be exceedingly enterprise-heavy with poor user experience and slow integration times for modern developer environments.

---

## 4. Problem Statement

*How can an organization enforce rigid, multi-tier task approval processes while eliminating the context-switching and communication breakdown that typically occurs between isolated project management and messaging platforms?*

Organizations require a platform where:
1. Tasks inherently respect a company’s operational hierarchy.
2. Every task generates an isolated, native communication channel to preserve context.
3. Users can simultaneously participate across multiple isolated teams seamlessly.

---

## 5. System Design

FlowPilot is built on a decoupled, scalable Client-Server architecture utilizing a modern stack:
- **Frontend Stack:** Single-page application built with React.js, React Router, Context API for state management, and customized CSS (incorporating modern glassmorphism, fluid animations, and dark-mode premium interfaces).
- **Backend Stack:** Django, Django REST Framework (DRF), and Python.
- **Database:** Relational Database model using SQLite (configurable to PostgreSQL) preserving strict constraint schemas mapping `CustomUser` → `UserTeamMembership` → `Tasks` → `Channels`.
- **Authentication:** JWT (JSON Web Tokens) handling stateless access/refresh cycles.

### Core Architectural Concepts:
- **Hierarchical Engine:** Users possess strict integer-based `role_levels` (Superadmin: 0 to Intern: 4). The `TicketPipeline` logic routes endpoints sequentially up this integer tree based on the selected `WorkflowTemplate`.
- **Relational Access Control (Multi-Team isolation):** Rather than standard flat structures, data visibility (Messages, Members, Tasks) dynamically scopes per request against the user's active `UserTeamMembership`.

---

## 6. Implementation

Key modules implemented in the system:
1. **User & Team Management:** Users can dynamically request to join multiple teams using unique `ABC-123` generated codes. Complex serializers map `all_teams` properties, ensuring active scope switching updates the front end immediately via React Hook dependency waterfalls.
2. **Dynamic Workflow Engine:** Tasks operate alongside `WorkflowInstance` and `WorkflowSteps`. Tickets can utilize 'Standard' procedural escalation or 'Direct Bypass' models depending on the ticket's priority flag instantiated by the creator.
3. **Communication Module:** Real-time simulated API pooling builds an instantaneous Group Chat and Direct Message paradigm, dynamically synchronizing `TeamMembers` when Join Requests are approved by management.
4. **Calendar Integration:** Provides interactive sprint schedules chronologically tied to existing Task definitions.

---

## 7. Testing

FlowPilot Enterprise enforces robustness through rigorous systematic testing, identifying and resolving several critical edge cases prior to deployment:
- **Access/Security Testing:** Validated strict data-silos preventing users from querying task queries for teams they departed. Checked API boundaries prohibiting lower-level roles from bypassing mid-management approval checkpoints.
- **Pagination Handlers:** Solved data-rendering limitations by safely tuning DRF's REST serializers globally, preventing "invisible user" and "hidden ticket" glitches caused by silent background pagination caps.
- **Concurrency & UI Resilience:** Re-engineered forms (such as `CreateTask.js`) to degrade gracefully. If backend template engines fail or network latency occurs, built-in frontend native templates catch the error and route standard payload primitives natively to ensure uptime.

---

## 8. Conclusion & Future Enhancements

**Conclusion:**
FlowPilot successfully centralizes complex organizational operations into one fluid, state-of-the-art interface. By forcing workflow approvals, team chats, and sprint calendars to coexist under strict hierarchal boundaries natively, productivity constraints resulting from platform fragmentation are effectively eliminated.

**Future Enhancements:**
1. **Real-Time WebSockets:** Upgrading the Chat API pooling mechanism to Django Channels / Redis WebSockets for true sub-millisecond bidirectional communication feeds.
2. **External Webhooks:** Building out modular GitHub/GitLab ingress APIs, so commits and PR merges can automatically trigger Ticket escalation approvals if code passes review.
3. **Advanced Reporting Engine:** Implementing analytical overview dashboards for Superadmins to measure average approval times, bottleneck roles, and KPI metrics over time utilizing Chart.js integrations.
4. **Mobile Responsive Architecture:** Expanding the UI fluid flexboxes to support native packaging within React Native or Progressive Web App (PWA) specifications.