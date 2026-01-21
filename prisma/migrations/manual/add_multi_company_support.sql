-- Migration: Add Multi-Company Support
-- Run this SQL manually if Prisma migrations are blocked by cache permission issues

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cif" TEXT,
    "regCom" TEXT,
    "address" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'România',
    "bankName" TEXT,
    "bankAccount" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "facturisApiKey" TEXT,
    "facturisUsername" TEXT,
    "facturisPassword" TEXT,
    "facturisCompanyCif" TEXT,
    "fancourierClientId" TEXT,
    "fancourierUsername" TEXT,
    "fancourierPassword" TEXT,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "senderEmail" TEXT,
    "senderCounty" TEXT,
    "senderCity" TEXT,
    "senderStreet" TEXT,
    "senderNumber" TEXT,
    "senderPostalCode" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "intercompanyMarkup" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 19.0,
    "vatPayer" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Create indexes for companies
CREATE UNIQUE INDEX IF NOT EXISTS "companies_name_key" ON "companies"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "companies_code_key" ON "companies"("code");
CREATE INDEX IF NOT EXISTS "companies_cif_idx" ON "companies"("cif");
CREATE INDEX IF NOT EXISTS "companies_isPrimary_idx" ON "companies"("isPrimary");

-- 2. Create intercompany_invoices table
CREATE TABLE IF NOT EXISTS "intercompany_invoices" (
    "id" TEXT NOT NULL,
    "issuedByCompanyId" TEXT NOT NULL,
    "receivedByCompanyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceSeries" TEXT,
    "totalValue" DECIMAL(12,2) NOT NULL,
    "totalVat" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalWithVat" DECIMAL(12,2) NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "lineItems" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intercompany_invoices_pkey" PRIMARY KEY ("id")
);

-- Create indexes for intercompany_invoices
CREATE UNIQUE INDEX IF NOT EXISTS "intercompany_invoices_invoiceNumber_key" ON "intercompany_invoices"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "intercompany_invoices_issuedByCompanyId_idx" ON "intercompany_invoices"("issuedByCompanyId");
CREATE INDEX IF NOT EXISTS "intercompany_invoices_receivedByCompanyId_idx" ON "intercompany_invoices"("receivedByCompanyId");
CREATE INDEX IF NOT EXISTS "intercompany_invoices_status_idx" ON "intercompany_invoices"("status");
CREATE INDEX IF NOT EXISTS "intercompany_invoices_periodStart_periodEnd_idx" ON "intercompany_invoices"("periodStart", "periodEnd");

-- 3. Create intercompany_order_links table
CREATE TABLE IF NOT EXISTS "intercompany_order_links" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "intercompanyInvoiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "settledAt" TIMESTAMP(3),
    "orderValue" DECIMAL(12,2),
    "costValue" DECIMAL(12,2),
    "intercompanyValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intercompany_order_links_pkey" PRIMARY KEY ("id")
);

-- Create indexes for intercompany_order_links
CREATE UNIQUE INDEX IF NOT EXISTS "intercompany_order_links_orderId_key" ON "intercompany_order_links"("orderId");
CREATE INDEX IF NOT EXISTS "intercompany_order_links_status_idx" ON "intercompany_order_links"("status");
CREATE INDEX IF NOT EXISTS "intercompany_order_links_intercompanyInvoiceId_idx" ON "intercompany_order_links"("intercompanyInvoiceId");

-- 4. Add new columns to stores
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- 5. Add new columns to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billingCompanyId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "operationalWarehouseId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "requiredTransferId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "intercompanyStatus" TEXT;

-- 6. Add new columns to invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceSeriesId" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceProvider" TEXT DEFAULT 'smartbill';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "facturisId" TEXT;

-- 7. Add new columns to awbs
ALTER TABLE "awbs" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "awbs" ADD COLUMN IF NOT EXISTS "isCollected" BOOLEAN DEFAULT false;
ALTER TABLE "awbs" ADD COLUMN IF NOT EXISTS "collectedAt" TIMESTAMP(3);
ALTER TABLE "awbs" ADD COLUMN IF NOT EXISTS "collectedAmount" DECIMAL(10,2);

-- 8. Add new columns to invoice_series
ALTER TABLE "invoice_series" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "invoice_series" ADD COLUMN IF NOT EXISTS "currentNumber" INTEGER DEFAULT 1;
ALTER TABLE "invoice_series" ADD COLUMN IF NOT EXISTS "numberPadding" INTEGER DEFAULT 6;
-- Note: startNumber might already exist as startingNumber - check your schema

-- 9. Add new columns to warehouses
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "isOperational" BOOLEAN DEFAULT false;

-- 10. Add new columns to warehouse_transfers
ALTER TABLE "warehouse_transfers" ADD COLUMN IF NOT EXISTS "isAutoProposed" BOOLEAN DEFAULT false;
ALTER TABLE "warehouse_transfers" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "warehouse_transfers" ADD COLUMN IF NOT EXISTS "approvedByName" TEXT;
ALTER TABLE "warehouse_transfers" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "warehouse_transfers" ADD COLUMN IF NOT EXISTS "requiredForOrderId" TEXT;

-- 11. Add foreign key constraints

-- companies -> stores
ALTER TABLE "stores" ADD CONSTRAINT "stores_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- companies -> orders
ALTER TABLE "orders" ADD CONSTRAINT "orders_billingCompanyId_fkey"
    FOREIGN KEY ("billingCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- warehouses -> orders (operationalWarehouse)
ALTER TABLE "orders" ADD CONSTRAINT "orders_operationalWarehouseId_fkey"
    FOREIGN KEY ("operationalWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- warehouse_transfers -> orders (requiredTransfer)
ALTER TABLE "orders" ADD CONSTRAINT "orders_requiredTransferId_fkey"
    FOREIGN KEY ("requiredTransferId") REFERENCES "warehouse_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- companies -> invoices
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- invoice_series -> invoices
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoiceSeriesId_fkey"
    FOREIGN KEY ("invoiceSeriesId") REFERENCES "invoice_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- companies -> awbs
ALTER TABLE "awbs" ADD CONSTRAINT "awbs_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- companies -> invoice_series
ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- intercompany_invoices foreign keys
ALTER TABLE "intercompany_invoices" ADD CONSTRAINT "intercompany_invoices_issuedByCompanyId_fkey"
    FOREIGN KEY ("issuedByCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "intercompany_invoices" ADD CONSTRAINT "intercompany_invoices_receivedByCompanyId_fkey"
    FOREIGN KEY ("receivedByCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- intercompany_order_links foreign keys
ALTER TABLE "intercompany_order_links" ADD CONSTRAINT "intercompany_order_links_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "intercompany_order_links" ADD CONSTRAINT "intercompany_order_links_intercompanyInvoiceId_fkey"
    FOREIGN KEY ("intercompanyInvoiceId") REFERENCES "intercompany_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- orders -> warehouse_transfers (requiredForOrderId)
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_requiredForOrderId_fkey"
    FOREIGN KEY ("requiredForOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create unique index for requiredTransferId on orders (one-to-one)
CREATE UNIQUE INDEX IF NOT EXISTS "orders_requiredTransferId_key" ON "orders"("requiredTransferId");

-- Create unique index for requiredForOrderId on warehouse_transfers (one-to-one)
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_transfers_requiredForOrderId_key" ON "warehouse_transfers"("requiredForOrderId");

-- 12. Create additional indexes for performance
CREATE INDEX IF NOT EXISTS "stores_companyId_idx" ON "stores"("companyId");
CREATE INDEX IF NOT EXISTS "orders_billingCompanyId_idx" ON "orders"("billingCompanyId");
CREATE INDEX IF NOT EXISTS "orders_operationalWarehouseId_idx" ON "orders"("operationalWarehouseId");
CREATE INDEX IF NOT EXISTS "orders_intercompanyStatus_idx" ON "orders"("intercompanyStatus");
CREATE INDEX IF NOT EXISTS "invoices_companyId_idx" ON "invoices"("companyId");
CREATE INDEX IF NOT EXISTS "awbs_companyId_idx" ON "awbs"("companyId");
CREATE INDEX IF NOT EXISTS "awbs_isCollected_idx" ON "awbs"("isCollected");
CREATE INDEX IF NOT EXISTS "invoice_series_companyId_idx" ON "invoice_series"("companyId");
CREATE INDEX IF NOT EXISTS "warehouses_isOperational_idx" ON "warehouses"("isOperational");

-- 13. Add missing columns for Settings (needed for Prisma schema compatibility)
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "defaultVatRate" INTEGER DEFAULT 19;

-- 14. Add Facturis invoice columns
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceSeriesName" TEXT;

-- 15. Add missing columns for InvoiceSeries
ALTER TABLE "invoice_series" ADD COLUMN IF NOT EXISTS "sync_to_smartbill" BOOLEAN DEFAULT false;
ALTER TABLE "invoice_series" ADD COLUMN IF NOT EXISTS "smartbill_series" TEXT;

-- Done!
-- After running this migration, run: npx prisma generate (if cache permits)
-- Or manually restart the application to pick up schema changes
