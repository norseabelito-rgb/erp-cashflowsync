# Phase 7: Task Management Core - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Basic task management for operational and business tracking. Users can create tasks with title, description, type, priority, deadline, and assignee. Tasks are displayed in a list with filtering and can be marked complete. Automation, notifications, and reporting are separate phases (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Task types & structure
- Multiple specific task types: picking, verificare, expediere, meeting, deadline, follow-up, etc.
- 4 priority levels: Low, Medium, High, Urgent
- Deadline is optional (not required for all tasks)
- Extended fields: description, linked entity (order/product/invoice), and file attachments

### Task list & filtering
- Table list view (consistent with Orders/Invoices pages, no kanban)
- Smart filter presets: Today, Overdue, This week, My tasks
- Default sort: Priority descending, then deadline ascending (Urgent/High first, soonest deadline within priority)
- Group by date sections: Today, Tomorrow, This Week, Later

### Assignment & ownership
- Anyone can assign tasks to anyone (no role restrictions)
- Unassigned tasks allowed (can exist without an owner)
- Reassignment requires a comment/handoff note explaining why
- Creator tracked in system but no special permissions (just metadata)

### Completion flow
- Single click to mark complete (fast for operational volume)
- Completed tasks move to "Done" section at bottom of list
- Tasks can be reopened unlimited times (no time restriction)
- Completed tasks retained forever (full audit trail)

### Claude's Discretion
- Exact task type enum values and Romanian labels
- Table column layout and responsive behavior
- Filter UI implementation (dropdowns vs chips vs sidebar)
- Attachment storage approach and file size limits
- Linked entity UI (dropdown vs search vs modal picker)

</decisions>

<specifics>
## Specific Ideas

- Table list should feel consistent with existing Orders and Invoices pages
- Smart presets similar to how modern task apps (Todoist, Things) show time-based views
- Priority colors should match the design tokens from Phase 6 (UX Foundation)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-task-management-core*
*Context gathered: 2026-01-26*
