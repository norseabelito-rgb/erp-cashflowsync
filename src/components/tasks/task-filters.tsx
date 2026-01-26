"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskStatus, TaskPriority } from "@/lib/task-utils";

// Task types matching Prisma enum
export type TaskType =
  | "PICKING"
  | "VERIFICARE"
  | "EXPEDIERE"
  | "MEETING"
  | "DEADLINE"
  | "FOLLOW_UP"
  | "BUSINESS"
  | "OTHER";

// Filter presets with Romanian labels (no diacritics)
export const FILTER_PRESETS = {
  all: "Toate task-urile",
  today: "Astazi",
  overdue: "Intarziate",
  this_week: "Saptamana aceasta",
  my_tasks: "Task-urile mele",
} as const;

export type FilterPreset = keyof typeof FILTER_PRESETS;

// Task type labels for dropdowns
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  PICKING: "Picking",
  VERIFICARE: "Verificare",
  EXPEDIERE: "Expediere",
  MEETING: "Intalnire",
  DEADLINE: "Deadline",
  FOLLOW_UP: "Urmarire",
  BUSINESS: "Business",
  OTHER: "Altele",
};

// Status labels
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Active",
  COMPLETED: "Finalizate",
};

// Priority labels
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  URGENT: "Urgent",
  HIGH: "Ridicata",
  MEDIUM: "Medie",
  LOW: "Scazuta",
};

interface User {
  id: string;
  name: string;
}

interface TaskFiltersProps {
  activePreset: FilterPreset;
  onPresetChange: (preset: FilterPreset) => void;
  typeFilter?: TaskType | "all";
  onTypeChange?: (type: TaskType | "all") => void;
  statusFilter?: TaskStatus | "all";
  onStatusChange?: (status: TaskStatus | "all") => void;
  assigneeFilter?: string | "all";
  onAssigneeChange?: (assigneeId: string | "all") => void;
  users?: User[];
}

export function TaskFilters({
  activePreset,
  onPresetChange,
  typeFilter = "all",
  onTypeChange,
  statusFilter = "all",
  onStatusChange,
  assigneeFilter = "all",
  onAssigneeChange,
  users = [],
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Preset buttons row */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_PRESETS) as FilterPreset[]).map((preset) => (
          <Button
            key={preset}
            variant={activePreset === preset ? "default" : "ghost"}
            size="sm"
            onClick={() => onPresetChange(preset)}
            className="whitespace-nowrap"
          >
            {FILTER_PRESETS[preset]}
          </Button>
        ))}
      </div>

      {/* Additional filter dropdowns */}
      <div className="flex flex-wrap gap-3">
        {/* Type filter */}
        {onTypeChange && (
          <Select
            value={typeFilter}
            onValueChange={(value) => onTypeChange(value as TaskType | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tip task" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate tipurile</SelectItem>
              {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {TASK_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status filter */}
        {onStatusChange && (
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusChange(value as TaskStatus | "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate statusurile</SelectItem>
              {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Assignee filter */}
        {onAssigneeChange && users.length > 0 && (
          <Select
            value={assigneeFilter}
            onValueChange={(value) => onAssigneeChange(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Responsabil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toti responsabilii</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
