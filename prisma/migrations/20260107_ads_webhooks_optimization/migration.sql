-- Migration: Add webhook support and campaign detail sync optimization
-- Date: 2026-01-07

-- Add lastDetailSyncAt and detailSyncInProgress to ads_campaigns
ALTER TABLE "ads_campaigns" ADD COLUMN IF NOT EXISTS "lastDetailSyncAt" TIMESTAMP(3);
ALTER TABLE "ads_campaigns" ADD COLUMN IF NOT EXISTS "detailSyncInProgress" BOOLEAN NOT NULL DEFAULT false;

-- Add SmartBill warehouses cache
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smartbillWarehousesCache" TEXT;

-- Create ads_webhook_configs table
CREATE TABLE IF NOT EXISTS "ads_webhook_configs" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "appSecret" TEXT,
    "subscriptions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastEventAt" TIMESTAMP(3),
    "eventsReceived" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_webhook_configs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on platform
CREATE UNIQUE INDEX IF NOT EXISTS "ads_webhook_configs_platform_key" ON "ads_webhook_configs"("platform");

-- Create ads_webhook_events table
CREATE TABLE IF NOT EXISTS "ads_webhook_events" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "objectId" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_webhook_events_pkey" PRIMARY KEY ("id")
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS "ads_webhook_events_platform_eventType_idx" ON "ads_webhook_events"("platform", "eventType");
CREATE INDEX IF NOT EXISTS "ads_webhook_events_receivedAt_idx" ON "ads_webhook_events"("receivedAt");
