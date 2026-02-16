-- Internal Order Statuses table
-- Quick task q004: Order Status Nomenclator

CREATE TABLE IF NOT EXISTS "internal_order_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_order_statuses_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on name
CREATE UNIQUE INDEX IF NOT EXISTS "internal_order_statuses_name_key" ON "internal_order_statuses"("name");

-- Add internalStatusId to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "internalStatusId" TEXT;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS "orders_internalStatusId_idx" ON "orders"("internalStatusId");

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_internalStatusId_fkey'
    ) THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_internalStatusId_fkey"
        FOREIGN KEY ("internalStatusId") REFERENCES "internal_order_statuses"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
