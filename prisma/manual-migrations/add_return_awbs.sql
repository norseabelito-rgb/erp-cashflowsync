-- Create return_awbs table for tracking returned shipments
CREATE TABLE IF NOT EXISTS return_awbs (
    id TEXT PRIMARY KEY,

    -- The return AWB number (scanned at warehouse)
    "returnAwbNumber" TEXT NOT NULL UNIQUE,

    -- Link to original AWB (the outbound shipment that was returned)
    "originalAwbId" TEXT REFERENCES awbs(id),

    -- Direct link to order (for cases where original AWB might be deleted)
    "orderId" TEXT REFERENCES orders(id),

    -- Status tracking: received, processed, stock_returned, invoice_reversed
    status TEXT NOT NULL DEFAULT 'received',

    -- Scan info
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedBy" TEXT,
    "scannedByName" TEXT,

    -- Processing info
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "processedByName" TEXT,

    -- Notes
    notes TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "return_awbs_orderId_idx" ON return_awbs("orderId");
CREATE INDEX IF NOT EXISTS "return_awbs_originalAwbId_idx" ON return_awbs("originalAwbId");
CREATE INDEX IF NOT EXISTS "return_awbs_status_idx" ON return_awbs(status);
CREATE INDEX IF NOT EXISTS "return_awbs_scannedAt_idx" ON return_awbs("scannedAt");
