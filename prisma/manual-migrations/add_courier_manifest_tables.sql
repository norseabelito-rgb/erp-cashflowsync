-- Migration: Add Courier Manifest Tables
-- Phase: 7.10 - Courier Manifest & Invoice Reconciliation
-- Date: 2026-02-07
-- Purpose: Enable manifest-based invoice cancellation and payment marking

-- Create enums
CREATE TYPE "ManifestType" AS ENUM ('RETURN', 'DELIVERY');
CREATE TYPE "ManifestStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'CONFIRMED', 'PROCESSED');
CREATE TYPE "ManifestItemStatus" AS ENUM ('PENDING', 'PROCESSED', 'ERROR');
CREATE TYPE "PINApprovalType" AS ENUM ('STORNARE', 'INCASARE');
CREATE TYPE "PINApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "CancellationSource" AS ENUM ('MANIFEST_RETURN', 'PIN_APPROVAL');
CREATE TYPE "PaymentSource" AS ENUM ('MANIFEST_DELIVERY', 'PIN_APPROVAL');

-- Create courier_manifests table
CREATE TABLE "courier_manifests" (
    "id" TEXT NOT NULL,
    "type" "ManifestType" NOT NULL,
    "status" "ManifestStatus" NOT NULL DEFAULT 'DRAFT',
    "documentDate" TIMESTAMP(3) NOT NULL,
    "courierRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "courier_manifests_pkey" PRIMARY KEY ("id")
);

-- Create manifest_items table
CREATE TABLE "manifest_items" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "awbNumber" TEXT NOT NULL,
    "originalAwb" TEXT,
    "invoiceId" TEXT,
    "orderId" TEXT,
    "processedAt" TIMESTAMP(3),
    "status" "ManifestItemStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,

    CONSTRAINT "manifest_items_pkey" PRIMARY KEY ("id")
);

-- Create pin_approval_requests table
CREATE TABLE "pin_approval_requests" (
    "id" TEXT NOT NULL,
    "type" "PINApprovalType" NOT NULL,
    "status" "PINApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "pin_approval_requests_pkey" PRIMARY KEY ("id")
);

-- Add columns to invoices table
ALTER TABLE "invoices" ADD COLUMN "cancellationSource" "CancellationSource";
ALTER TABLE "invoices" ADD COLUMN "cancelledFromManifestId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "paymentSource" "PaymentSource";
ALTER TABLE "invoices" ADD COLUMN "paidFromManifestId" TEXT;

-- Add columns to settings table
ALTER TABLE "settings" ADD COLUMN "pinHash" TEXT;
ALTER TABLE "settings" ADD COLUMN "pinChangedAt" TIMESTAMP(3);

-- Create indexes
CREATE INDEX "courier_manifests_type_status_idx" ON "courier_manifests"("type", "status");
CREATE INDEX "courier_manifests_documentDate_idx" ON "courier_manifests"("documentDate");
CREATE INDEX "manifest_items_manifestId_idx" ON "manifest_items"("manifestId");
CREATE INDEX "manifest_items_invoiceId_idx" ON "manifest_items"("invoiceId");
CREATE INDEX "manifest_items_awbNumber_idx" ON "manifest_items"("awbNumber");
CREATE INDEX "pin_approval_requests_status_idx" ON "pin_approval_requests"("status");
CREATE INDEX "pin_approval_requests_invoiceId_idx" ON "pin_approval_requests"("invoiceId");
CREATE INDEX "pin_approval_requests_expiresAt_idx" ON "pin_approval_requests"("expiresAt");

-- Add foreign keys
ALTER TABLE "courier_manifests" ADD CONSTRAINT "courier_manifests_confirmedById_fkey"
    FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "manifest_items" ADD CONSTRAINT "manifest_items_manifestId_fkey"
    FOREIGN KEY ("manifestId") REFERENCES "courier_manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "manifest_items" ADD CONSTRAINT "manifest_items_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "manifest_items" ADD CONSTRAINT "manifest_items_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pin_approval_requests" ADD CONSTRAINT "pin_approval_requests_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pin_approval_requests" ADD CONSTRAINT "pin_approval_requests_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pin_approval_requests" ADD CONSTRAINT "pin_approval_requests_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cancelledFromManifestId_fkey"
    FOREIGN KEY ("cancelledFromManifestId") REFERENCES "courier_manifests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paidFromManifestId_fkey"
    FOREIGN KEY ("paidFromManifestId") REFERENCES "courier_manifests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verification query
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully';
    RAISE NOTICE 'Tables created: courier_manifests, manifest_items, pin_approval_requests';
    RAISE NOTICE 'Columns added to invoices: cancellationSource, cancelledFromManifestId, paymentSource, paidFromManifestId';
    RAISE NOTICE 'Columns added to settings: pinHash, pinChangedAt';
END $$;
