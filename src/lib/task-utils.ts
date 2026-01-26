/**
 * Task Management Utility Functions
 *
 * Helper functions for date grouping, priority sorting, and overdue detection
 * Used by task list views and task management components
 */

import { isToday, isTomorrow, isThisWeek, isBefore, startOfDay, parseISO } from "date-fns";

// ============================================
// Types
// ============================================

/**
 * Task priority values matching Prisma enum
 */
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/**
 * Task status values matching Prisma enum
 */
export type TaskStatus = "PENDING" | "COMPLETED";

/**
 * Date group categories for task organization
 */
export type DateGroup =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "no_deadline"
  | "completed";

/**
 * Minimal task shape required for grouping and sorting functions
 */
export interface TaskForGrouping {
  deadline: string | Date | null;
  status: TaskStatus;
}

/**
 * Minimal task shape required for priority sorting
 */
export interface TaskForSorting {
  priority: TaskPriority;
}

// ============================================
// Constants
// ============================================

/**
 * Priority order for sorting (lower = higher priority)
 * URGENT tasks should appear first, then HIGH, MEDIUM, LOW
 */
export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Romanian labels for date groups (without diacritics per project convention)
 */
export const DATE_GROUP_LABELS: Record<DateGroup, string> = {
  overdue: "Intarziate",
  today: "Astazi",
  tomorrow: "Maine",
  this_week: "Saptamana aceasta",
  later: "Mai tarziu",
  no_deadline: "Fara deadline",
  completed: "Finalizate",
};

/**
 * Display order for date groups in the UI
 */
export const DATE_GROUP_ORDER: DateGroup[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "later",
  "no_deadline",
  "completed",
];

// ============================================
// Helper Functions
// ============================================

/**
 * Parse a deadline value to a Date object
 * Handles both string (ISO format) and Date inputs
 */
function parseDeadline(deadline: string | Date): Date {
  if (typeof deadline === "string") {
    return parseISO(deadline);
  }
  return deadline;
}

/**
 * Check if a deadline is overdue (before start of today)
 *
 * @param deadline - The deadline to check (ISO string or Date)
 * @returns true if the deadline is in the past
 */
export function isOverdue(deadline: string | Date): boolean {
  const deadlineDate = parseDeadline(deadline);
  const todayStart = startOfDay(new Date());
  return isBefore(deadlineDate, todayStart);
}

/**
 * Determine which date group a task belongs to
 *
 * Priority order:
 * 1. Completed tasks -> "completed"
 * 2. No deadline -> "no_deadline"
 * 3. Overdue -> "overdue"
 * 4. Today -> "today"
 * 5. Tomorrow -> "tomorrow"
 * 6. This week -> "this_week"
 * 7. Everything else -> "later"
 */
export function getDateGroup(task: TaskForGrouping): DateGroup {
  // Completed tasks always go to completed group
  if (task.status === "COMPLETED") {
    return "completed";
  }

  // Tasks without deadline
  if (!task.deadline) {
    return "no_deadline";
  }

  const deadlineDate = parseDeadline(task.deadline);

  // Check overdue first (before today)
  if (isOverdue(deadlineDate)) {
    return "overdue";
  }

  // Check today
  if (isToday(deadlineDate)) {
    return "today";
  }

  // Check tomorrow
  if (isTomorrow(deadlineDate)) {
    return "tomorrow";
  }

  // Check this week
  if (isThisWeek(deadlineDate, { weekStartsOn: 1 })) {
    return "this_week";
  }

  // Everything else is later
  return "later";
}

/**
 * Group an array of tasks by their date group
 *
 * @param tasks - Array of tasks to group
 * @returns Record mapping each DateGroup to its tasks
 */
export function groupTasksByDate<T extends TaskForGrouping>(
  tasks: T[]
): Record<DateGroup, T[]> {
  // Initialize all groups as empty arrays
  const groups: Record<DateGroup, T[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
    no_deadline: [],
    completed: [],
  };

  // Assign each task to its group
  for (const task of tasks) {
    const group = getDateGroup(task);
    groups[group].push(task);
  }

  return groups;
}

/**
 * Sort tasks by priority (URGENT first, then HIGH, MEDIUM, LOW)
 *
 * @param tasks - Array of tasks to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortTasksByPriority<T extends TaskForSorting>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

/**
 * Sort tasks by priority, then by deadline (ascending)
 * Tasks without deadline come after tasks with deadline
 *
 * @param tasks - Array of tasks to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortTasksByPriorityAndDeadline<
  T extends TaskForSorting & TaskForGrouping
>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // First sort by priority
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // Then sort by deadline (nulls last)
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;

    const dateA = parseDeadline(a.deadline);
    const dateB = parseDeadline(b.deadline);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Get tasks that are overdue
 *
 * @param tasks - Array of tasks to filter
 * @returns Array of overdue tasks (pending with deadline in the past)
 */
export function getOverdueTasks<T extends TaskForGrouping>(tasks: T[]): T[] {
  return tasks.filter((task) => {
    if (task.status === "COMPLETED" || !task.deadline) {
      return false;
    }
    return isOverdue(task.deadline);
  });
}

/**
 * Get tasks due today
 *
 * @param tasks - Array of tasks to filter
 * @returns Array of tasks due today (pending)
 */
export function getTodayTasks<T extends TaskForGrouping>(tasks: T[]): T[] {
  return tasks.filter((task) => {
    if (task.status === "COMPLETED" || !task.deadline) {
      return false;
    }
    return isToday(parseDeadline(task.deadline));
  });
}

/**
 * Count tasks by date group
 *
 * @param tasks - Array of tasks to count
 * @returns Record mapping each DateGroup to its task count
 */
export function countTasksByDateGroup(
  tasks: TaskForGrouping[]
): Record<DateGroup, number> {
  const groups = groupTasksByDate(tasks);
  return {
    overdue: groups.overdue.length,
    today: groups.today.length,
    tomorrow: groups.tomorrow.length,
    this_week: groups.this_week.length,
    later: groups.later.length,
    no_deadline: groups.no_deadline.length,
    completed: groups.completed.length,
  };
}
