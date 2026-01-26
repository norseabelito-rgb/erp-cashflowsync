---
phase: 07-task-management-core
plan: 04
subsystem: ui
tags: [tasks, dialog, form, react, sidebar]
completed: 2026-01-26
duration: ~13 minutes
status: complete
dependency_graph:
  requires: ["07-02"]
  provides:
    - TaskFormDialog component
    - Dialog integration in tasks page
    - Sidebar navigation entry
  affects: ["08-notifications"]
tech_stack:
  added: []
  patterns:
    - Dialog-based form pattern with create/edit modes
    - Reassignment validation with conditional field display
key_files:
  created:
    - src/components/tasks/task-form-dialog.tsx
  modified:
    - src/app/(dashboard)/tasks/page.tsx
    - src/components/sidebar.tsx
decisions:
  - key: date-picker-native
    choice: Native HTML date input instead of react-day-picker
    rationale: Package installation blocked by permission issues, native input provides adequate functionality
  - key: tasks-under-vanzari
    choice: Tasks nav item placed under Vanzari section
    rationale: Tasks span all operational areas but most related to order/invoice workflow
metrics:
  tasks_completed: 3
  tasks_total: 3
  commits: 3
---

# Phase 7 Plan 4: Task Form Dialog Summary

**One-liner:** TaskFormDialog component with create/edit modes, reassignment validation, and full tasks page integration with sidebar nav

## What Was Built

### Task 1: Task Form Dialog Component

Created `src/components/tasks/task-form-dialog.tsx` providing:

- **Props interface** supporting create and edit modes via optional `task` prop
- **Form fields:**
  - Title (required)
  - Description (optional)
  - Type dropdown with 8 options (Romanian labels without diacritics)
  - Priority dropdown with 4 levels
  - Deadline date picker using native HTML date input
  - Assignee dropdown with "Neasignat" option
  - Reassignment note (conditionally shown when assignee changes in edit mode)
- **API integration:**
  - POST /api/tasks for create
  - PATCH /api/tasks/[id] for edit
- **Validation:**
  - Title required on submit
  - Reassignment note required when changing assignee
- **ActionTooltip** applied to form elements per Phase 6 convention

### Task 2: Dialog Integration in Tasks Page

Updated `src/app/(dashboard)/tasks/page.tsx`:

- Added dialog state management (`isCreateDialogOpen`, `editingTask`)
- Wired "Creeaza task" button to open create dialog with ActionTooltip
- Added edit action to dropdown menu with Pencil icon
- Connected dialog success callback to query invalidation
- Fixed users API endpoint (was `/api/users`, now `/api/rbac/users`)
- Extended Task interface for full type compatibility with TaskFormDialog
- Rendered both create and edit dialogs at component bottom

### Task 3: Sidebar Navigation Entry

Updated `src/components/sidebar.tsx`:

- Added "Task-uri" link under Vanzari section
- Used ClipboardList icon (already imported for other items)
- Added tasks.view permission requirement
- Updated parent section permissions to include tasks.view

## Technical Details

**Type definitions exported from task-form-dialog.tsx:**
- TaskType (8 values)
- TaskPriority (4 values)
- Task interface
- TaskFormDialogProps

**Romanian labels (no diacritics):**
- Type: Picking, Verificare, Expediere, Intalnire, Deadline, Urmarire, Business, Altele
- Priority: Scazuta, Medie, Ridicata, Urgent

**Reassignment flow:**
1. Dialog detects edit mode via `task` prop
2. Tracks original assigneeId on mount
3. Compares current assigneeId to original
4. Shows reassignment note field when changed
5. Validates note present before submit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Native date input instead of DayPicker**
- **Found during:** Task 1
- **Issue:** react-day-picker not installed, npm install failed due to permissions
- **Fix:** Used native HTML `<input type="date">` with format/parseISO from date-fns
- **Files modified:** src/components/tasks/task-form-dialog.tsx
- **Commit:** 1a0018a

**2. [Rule 1 - Bug] Fixed users API endpoint**
- **Found during:** Task 2
- **Issue:** Tasks page was fetching from `/api/users` which doesn't exist
- **Fix:** Changed to `/api/rbac/users` and handled array response format
- **Files modified:** src/app/(dashboard)/tasks/page.tsx
- **Commit:** d2db178

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 1a0018a | feat | Create task form dialog component |
| d2db178 | feat | Integrate task form dialog into tasks page |
| b659081 | feat | Add tasks navigation entry to sidebar |

## Verification Results

- [x] `npm run build` succeeds (tasks page builds at 13.8 kB)
- [x] TaskFormDialog renders with all required fields
- [x] Create mode: empty form, saves new task
- [x] Edit mode: pre-filled form, updates existing task
- [x] Reassignment validation: note required when changing assignee
- [x] Dialog closes on success and triggers query invalidation
- [x] Sidebar navigation includes Tasks entry under Vanzari
- [x] All interactive elements have Romanian tooltips

## Next Phase Readiness

**Phase 7 Status:** Complete (4/4 plans done)

**Ready for Phase 8 (Notifications/Automation):**
- Task CRUD fully functional
- Task list with filtering operational
- Create/edit dialogs working
- Sidebar navigation in place

**No blockers for Phase 8.**
