"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTableRow } from "@/components/ui/skeleton";
import { useErrorModal } from "@/hooks/use-error-modal";
import { toast } from "@/hooks/use-toast";
import { getEmptyState, determineEmptyStateType } from "@/lib/empty-states";
import {
  groupTasksByDate,
  DATE_GROUP_LABELS,
  DATE_GROUP_ORDER,
  sortTasksByPriority,
  isOverdue,
  TaskStatus,
  TaskPriority,
  DateGroup,
} from "@/lib/task-utils";
import {
  TaskFilters,
  FilterPreset,
  TaskType,
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/components/tasks/task-filters";
import { TaskFormDialog, Task as TaskFormTask } from "@/components/tasks/task-form-dialog";
import { cn } from "@/lib/utils";

// Task interface matching API response
interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  assigneeId?: string | null;
  assignee: {
    id: string;
    name: string | null;
    image?: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  linkedOrderId?: string | null;
  linkedProductId?: string | null;
  linkedInvoiceId?: string | null;
  reassignmentNote?: string | null;
  order?: {
    id: string;
    shopifyOrderNumber: string;
  } | null;
  _count?: {
    attachments: number;
  };
}

interface User {
  id: string;
  name: string;
}

// Priority badge variant mapping
const PRIORITY_VARIANTS: Record<TaskPriority, "destructive" | "warning" | "info" | "neutral"> = {
  URGENT: "destructive",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { showError, ErrorModalComponent } = useErrorModal();

  // Filter state
  const [activePreset, setActivePreset] = useState<FilterPreset>("all");
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string | "all">("all");

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Build query params based on filters
  const buildQueryParams = () => {
    const params = new URLSearchParams();

    // Apply preset filters
    if (activePreset === "today") {
      params.set("filter", "today");
    } else if (activePreset === "overdue") {
      params.set("filter", "overdue");
    } else if (activePreset === "this_week") {
      params.set("filter", "this_week");
    } else if (activePreset === "my_tasks") {
      params.set("filter", "my_tasks");
    }

    // Apply additional filters
    if (typeFilter !== "all") {
      params.set("type", typeFilter);
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (assigneeFilter !== "all") {
      params.set("assigneeId", assigneeFilter);
    }

    return params.toString();
  };

  // Fetch tasks
  const {
    data: tasksData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["tasks", activePreset, typeFilter, statusFilter, assigneeFilter],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const res = await fetch(`/api/tasks${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch tasks");
      }
      return res.json();
    },
  });

  // Fetch users for assignee dropdown
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/users");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Toggle task completion mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, complete }: { taskId: string; complete: boolean }) => {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: (data, { complete }) => {
      toast({
        title: complete ? "Task finalizat" : "Task reactivat",
        description: complete
          ? "Task-ul a fost marcat ca finalizat."
          : "Task-ul a fost reactivat.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => {
      showError(error);
    },
  });

  const tasks: Task[] = tasksData?.tasks || [];
  // usersData is an array from /api/rbac/users
  const users: User[] = Array.isArray(usersData) ? usersData : [];

  // Check if filters are active
  const hasActiveFilters =
    activePreset !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    assigneeFilter !== "all";

  // Clear all filters
  const clearFilters = () => {
    setActivePreset("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setAssigneeFilter("all");
  };

  // Dialog handlers
  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const openEditDialog = (task: Task) => setEditingTask(task);

  const handleDialogSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setIsCreateDialogOpen(false);
    setEditingTask(null);
    // Toast is handled inside the dialog
  };

  // Group tasks by date
  const groupedTasks = groupTasksByDate(tasks);

  // Sort tasks within each group by priority
  const sortedGroups: Record<DateGroup, Task[]> = {} as Record<DateGroup, Task[]>;
  for (const group of DATE_GROUP_ORDER) {
    sortedGroups[group] = sortTasksByPriority(groupedTasks[group]);
  }

  // Format deadline for display
  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "-";
    try {
      return format(new Date(deadline), "d MMM yyyy", { locale: ro });
    } catch {
      return "-";
    }
  };

  // Handle checkbox click for completion toggle
  const handleToggleComplete = (task: Task) => {
    const complete = task.status === "PENDING";
    toggleCompleteMutation.mutate({ taskId: task.id, complete });
  };

  // Render a single task row
  const renderTaskRow = (task: Task) => {
    const isTaskOverdue = task.deadline && task.status === "PENDING" && isOverdue(task.deadline);
    const isCompleted = task.status === "COMPLETED";

    return (
      <TableRow key={task.id} className={cn(isCompleted && "opacity-60")}>
        {/* Checkbox for completion */}
        <TableCell className="w-[50px]">
          <ActionTooltip
            action={isCompleted ? "Reactiveaza task" : "Marcheaza ca finalizat"}
            disabled={toggleCompleteMutation.isPending}
            disabledReason="Se proceseaza..."
          >
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => handleToggleComplete(task)}
              disabled={toggleCompleteMutation.isPending}
            />
          </ActionTooltip>
        </TableCell>

        {/* Title */}
        <TableCell>
          <div>
            <span className={cn("font-medium", isCompleted && "line-through text-muted-foreground")}>
              {task.title}
            </span>
            {task.order && (
              <div className="text-xs text-muted-foreground mt-1">
                Comanda: {task.order.shopifyOrderNumber}
              </div>
            )}
          </div>
        </TableCell>

        {/* Type */}
        <TableCell>
          <Badge variant="outline">{TASK_TYPE_LABELS[task.type]}</Badge>
        </TableCell>

        {/* Priority */}
        <TableCell>
          <Badge variant={PRIORITY_VARIANTS[task.priority]}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
        </TableCell>

        {/* Assignee */}
        <TableCell>
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{task.assignee.name}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Neasignat</span>
          )}
        </TableCell>

        {/* Deadline */}
        <TableCell>
          {task.deadline ? (
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm",
                isTaskOverdue && "text-status-error font-medium"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatDeadline(task.deadline)}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>

        {/* Actions */}
        <TableCell>
          <DropdownMenu>
            <ActionTooltip action="Actiuni" consequence="Vezi optiunile disponibile">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </ActionTooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editeaza
              </DropdownMenuItem>
              {isCompleted ? (
                <DropdownMenuItem onClick={() => handleToggleComplete(task)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Redeschide
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleToggleComplete(task)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalizeaza
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-status-error focus:text-status-error">
                <Trash2 className="h-4 w-4 mr-2" />
                Sterge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  // Render task table with grouped sections
  const renderGroupedTasks = () => {
    const sections: JSX.Element[] = [];

    for (const group of DATE_GROUP_ORDER) {
      const groupTasks = sortedGroups[group];
      if (groupTasks.length === 0) continue;

      sections.push(
        <div key={group} className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-4">
            {DATE_GROUP_LABELS[group]} ({groupTasks.length})
          </h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Titlu</TableHead>
                    <TableHead className="w-[120px]">Tip</TableHead>
                    <TableHead className="w-[100px]">Prioritate</TableHead>
                    <TableHead className="w-[150px]">Responsabil</TableHead>
                    <TableHead className="w-[120px]">Deadline</TableHead>
                    <TableHead className="w-[60px]">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{groupTasks.map(renderTaskRow)}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
    }

    return sections;
  };

  return (
    <>
      <ErrorModalComponent />
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Task-uri</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Gestioneaza task-urile si activitatile
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ActionTooltip action="Reincarca task-uri" consequence="Se actualizeaza lista">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Reincarca</span>
              </Button>
            </ActionTooltip>
            <ActionTooltip
              action="Creeaza task"
              consequence="Deschide formularul pentru un task nou"
            >
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Creeaza task</span>
              </Button>
            </ActionTooltip>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <TaskFilters
              activePreset={activePreset}
              onPresetChange={setActivePreset}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              assigneeFilter={assigneeFilter}
              onAssigneeChange={setAssigneeFilter}
              users={users}
            />
          </CardContent>
        </Card>

        {/* Task List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Titlu</TableHead>
                    <TableHead className="w-[120px]">Tip</TableHead>
                    <TableHead className="w-[100px]">Prioritate</TableHead>
                    <TableHead className="w-[150px]">Responsabil</TableHead>
                    <TableHead className="w-[120px]">Deadline</TableHead>
                    <TableHead className="w-[60px]">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="p-0">
                        <SkeletonTableRow cols={7} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          (() => {
            const emptyStateType = determineEmptyStateType(hasActiveFilters, isError);
            const emptyConfig = getEmptyState("tasks", emptyStateType);
            return (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={emptyConfig.icon}
                    title={emptyConfig.title}
                    description={emptyConfig.description}
                    action={
                      emptyConfig.action?.onClick === "clearFilters"
                        ? { label: emptyConfig.action.label, onClick: clearFilters }
                        : emptyConfig.action?.onClick === "refresh"
                        ? { label: emptyConfig.action.label, onClick: () => refetch() }
                        : emptyConfig.action?.onClick === "createTask"
                        ? { label: emptyConfig.action.label, onClick: openCreateDialog }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            );
          })()
        ) : (
          renderGroupedTasks()
        )}
      </div>

      {/* Task Form Dialogs */}
      <TaskFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleDialogSuccess}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
      />

      <TaskFormDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask as TaskFormTask | null}
        onSuccess={handleDialogSuccess}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
      />
    </>
  );
}
