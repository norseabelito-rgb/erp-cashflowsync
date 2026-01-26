-- Migration: add_bulk_publish_job
-- Created: 2026-01-27
-- Enum pentru statusul job-urilor de publicare bulk
DO $$ BEGIN
    CREATE TYPE "BulkPublishStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabel pentru job-uri de publicare bulk produse pe canale multiple
CREATE TABLE IF NOT EXISTS "bulk_publish_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "BulkPublishStatus" NOT NULL DEFAULT 'PENDING',
    "product_ids" JSONB NOT NULL DEFAULT '[]',
    "channel_ids" JSONB NOT NULL DEFAULT '[]',
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "total_channels" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "channel_progress" JSONB NOT NULL DEFAULT '{}',
    "current_channel_id" TEXT,
    "current_product_idx" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_publish_jobs_pkey" PRIMARY KEY ("id")
);

-- Indexuri pentru performanta
CREATE INDEX IF NOT EXISTS "bulk_publish_jobs_status_idx" ON "bulk_publish_jobs"("status");
CREATE INDEX IF NOT EXISTS "bulk_publish_jobs_user_id_idx" ON "bulk_publish_jobs"("user_id");
CREATE INDEX IF NOT EXISTS "bulk_publish_jobs_created_at_idx" ON "bulk_publish_jobs"("created_at");
