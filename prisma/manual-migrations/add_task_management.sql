-- Add Task Management System
-- Migration: add_task_management
-- Created: 2026-01-26

-- Create TaskType enum
DO $$ BEGIN
    CREATE TYPE "TaskType" AS ENUM ('PICKING', 'VERIFICARE', 'EXPEDIERE', 'MEETING', 'DEADLINE', 'FOLLOW_UP', 'BUSINESS', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create TaskPriority enum
DO $$ BEGIN
    CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create TaskStatus enum
DO $$ BEGIN
    CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'BUSINESS',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "deadline" TIMESTAMP(3),
    "assignee_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "linked_order_id" TEXT,
    "linked_product_id" TEXT,
    "linked_invoice_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "reassignment_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS "task_attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for tasks
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_linked_order_id_fkey" FOREIGN KEY ("linked_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_linked_product_id_fkey" FOREIGN KEY ("linked_product_id") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_linked_invoice_id_fkey" FOREIGN KEY ("linked_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign keys for task_attachments
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes for tasks
CREATE INDEX IF NOT EXISTS "tasks_assignee_id_idx" ON "tasks"("assignee_id");
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks"("status");
CREATE INDEX IF NOT EXISTS "tasks_deadline_idx" ON "tasks"("deadline");
CREATE INDEX IF NOT EXISTS "tasks_type_idx" ON "tasks"("type");
CREATE INDEX IF NOT EXISTS "tasks_priority_deadline_idx" ON "tasks"("priority", "deadline");

-- Add index for task_attachments
CREATE INDEX IF NOT EXISTS "task_attachments_task_id_idx" ON "task_attachments"("task_id");
