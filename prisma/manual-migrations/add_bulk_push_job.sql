-- Bulk Push Jobs table for tracking product sync to Shopify stores
-- Created: 2026-01-26

CREATE TABLE IF NOT EXISTS bulk_push_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  progress JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bulk_push_jobs_status_idx ON bulk_push_jobs(status);
