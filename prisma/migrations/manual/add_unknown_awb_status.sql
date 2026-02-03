-- Add unknown_awb_statuses table for tracking unrecognized FanCourier status codes
-- This allows admins to review and manually map new statuses
-- Part of Phase 07.5: AWB Tracking Fix

CREATE TABLE IF NOT EXISTS "unknown_awb_statuses" (
  "id" TEXT NOT NULL,
  "statusCode" TEXT NOT NULL,
  "statusName" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "seenCount" INTEGER NOT NULL DEFAULT 1,
  "sampleAwbNumber" TEXT,
  "mappedCategory" TEXT,
  "mappedName" TEXT,
  "notes" TEXT,

  CONSTRAINT "unknown_awb_statuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "unknown_awb_statuses_statusCode_key" ON "unknown_awb_statuses"("statusCode");
CREATE INDEX IF NOT EXISTS "unknown_awb_statuses_statusCode_idx" ON "unknown_awb_statuses"("statusCode");
