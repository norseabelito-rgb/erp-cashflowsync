"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Loader2, CalendarIcon, X } from "lucide-react";

// ============================================
// Types
// ============================================

export type TaskType =
  | "PICKING"
  | "VERIFICARE"
  | "EXPEDIERE"
  | "MEETING"
  | "DEADLINE"
  | "FOLLOW_UP"
  | "BUSINESS"
  | "OTHER";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: "PENDING" | "COMPLETED";
  deadline: string | null;
  assigneeId: string | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  linkedOrderId: string | null;
  linkedProductId: string | null;
  linkedInvoiceId: string | null;
  reassignmentNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSuccess?: () => void;
  users: Array<{ id: string; name: string | null }>;
}

// ============================================
// Constants
// ============================================

/**
 * Type options with Romanian labels (no diacritics per project convention)
 */
const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "PICKING", label: "Picking" },
  { value: "VERIFICARE", label: "Verificare" },
  { value: "EXPEDIERE", label: "Expediere" },
  { value: "MEETING", label: "Intalnire" },
  { value: "DEADLINE", label: "Deadline" },
  { value: "FOLLOW_UP", label: "Urmarire" },
  { value: "BUSINESS", label: "Business" },
  { value: "OTHER", label: "Altele" },
];

/**
 * Priority options with Romanian labels (no diacritics)
 */
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Scazuta" },
  { value: "MEDIUM", label: "Medie" },
  { value: "HIGH", label: "Ridicata" },
  { value: "URGENT", label: "Urgent" },
];

// ============================================
// Component
// ============================================

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
  users,
}: TaskFormDialogProps) {
  const isEditing = !!task;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("BUSINESS");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [reassignmentNote, setReassignmentNote] = useState("");
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [linkedProductId, setLinkedProductId] = useState<string | null>(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);

  // Track original assignee for reassignment detection
  const [originalAssigneeId, setOriginalAssigneeId] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed values
  const isReassigning = isEditing && assigneeId !== (originalAssigneeId || "");
  const showReassignmentNote = isReassigning;

  // Pre-fill form when task changes (edit mode)
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setType(task.type || "BUSINESS");
      setPriority(task.priority || "MEDIUM");
      setDeadline(task.deadline ? new Date(task.deadline) : undefined);
      setAssigneeId(task.assigneeId || "");
      setOriginalAssigneeId(task.assigneeId);
      setReassignmentNote(task.reassignmentNote || "");
      setLinkedOrderId(task.linkedOrderId);
      setLinkedProductId(task.linkedProductId);
      setLinkedInvoiceId(task.linkedInvoiceId);
    } else {
      // Reset form for create mode
      resetForm();
    }
  }, [task, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("BUSINESS");
    setPriority("MEDIUM");
    setDeadline(undefined);
    setAssigneeId("");
    setOriginalAssigneeId(null);
    setReassignmentNote("");
    setLinkedOrderId(null);
    setLinkedProductId(null);
    setLinkedInvoiceId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate title
    if (!title.trim()) {
      toast({
        title: "Eroare",
        description: "Titlul este obligatoriu",
        variant: "destructive",
      });
      return;
    }

    // Validate reassignment note
    if (isReassigning && !reassignmentNote.trim()) {
      toast({
        title: "Eroare",
        description: "Nota de transfer este obligatorie la reasignare",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        deadline: deadline ? deadline.toISOString() : null,
        assigneeId: assigneeId || null,
        reassignmentNote: isReassigning ? reassignmentNote.trim() : null,
        linkedOrderId,
        linkedProductId,
        linkedInvoiceId,
      };

      const url = isEditing ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Eroare la salvare");
      }

      toast({
        title: isEditing ? "Task actualizat" : "Task creat",
        description: isEditing
          ? "Task-ul a fost actualizat cu succes"
          : "Task-ul a fost creat cu succes",
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A aparut o eroare",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editeaza task" : "Creeaza task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica detaliile task-ului"
              : "Completeaza datele pentru noul task"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title - Required */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Titlu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Introdu titlul task-ului"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descriere</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adauga o descriere (optional)"
              rows={3}
            />
          </div>

          {/* Type and Priority - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tip</Label>
              <ActionTooltip action="Selecteaza tipul task-ului">
                <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecteaza tip" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionTooltip>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritate</Label>
              <ActionTooltip action="Selecteaza prioritatea">
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TaskPriority)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecteaza prioritate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionTooltip>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <ActionTooltip action="Selecteaza deadline-ul" consequence="Optional">
              <div className="relative">
                <Input
                  id="deadline"
                  type="date"
                  value={deadline ? format(deadline, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDeadline(parseISO(e.target.value));
                    } else {
                      setDeadline(undefined);
                    }
                  }}
                  className={cn(
                    "pr-10",
                    !deadline && "text-muted-foreground"
                  )}
                />
                {deadline && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setDeadline(undefined)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Sterge deadline</span>
                  </Button>
                )}
              </div>
            </ActionTooltip>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Responsabil</Label>
            <ActionTooltip
              action="Selecteaza responsabilul"
              consequence="Poate fi lasat neasignat"
            >
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Neasignat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Neasignat</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ActionTooltip>
          </div>

          {/* Reassignment Note - Only visible when assignee changes during edit */}
          {showReassignmentNote && (
            <div className="space-y-2">
              <Label htmlFor="reassignmentNote">
                Nota de transfer <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reassignmentNote"
                value={reassignmentNote}
                onChange={(e) => setReassignmentNote(e.target.value)}
                placeholder="Explica motivul reasignarii task-ului"
                rows={2}
                required
              />
              <p className="text-xs text-muted-foreground">
                Nota este obligatorie la schimbarea responsabilului
              </p>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Anuleaza
            </Button>
            <ActionTooltip
              action={isEditing ? "Salveaza modificarile" : "Creeaza task-ul"}
              disabled={isSubmitting}
              disabledReason="Se proceseaza..."
            >
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salveaza" : "Creeaza"}
              </Button>
            </ActionTooltip>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
