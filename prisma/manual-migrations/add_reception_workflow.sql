-- =============================================
-- RECEPTION WORKFLOW MIGRATION
-- =============================================
-- This migration adds support for the complete goods reception workflow:
-- - PurchaseOrder (Precomanda)
-- - ReceptionReport (PV Receptie)
-- - ReceptionPhoto (Poze receptie)
-- - SupplierInvoice (Factura furnizor)
-- - PurchaseOrderItem (Linie precomanda)
-- - PurchaseOrderLabel (Etichete scanabile)
-- - ReceptionReportItem (Linie PV receptie)
-- - Extended GoodsReceipt with workflow fields
--
-- This migration is IDEMPOTENT - can be run multiple times safely.
-- =============================================

-- =============================================
-- SECTION 1: CREATE NEW ENUMS
-- =============================================

-- PurchaseOrderStatus
DO $$ BEGIN
    CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'APROBATA', 'IN_RECEPTIE', 'RECEPTIONATA', 'ANULATA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ReceptionReportStatus
DO $$ BEGIN
    CREATE TYPE "ReceptionReportStatus" AS ENUM ('DESCHIS', 'IN_COMPLETARE', 'FINALIZAT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PaymentStatus
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('NEPLATITA', 'PARTIAL_PLATITA', 'PLATITA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PhotoCategory
DO $$ BEGIN
    CREATE TYPE "PhotoCategory" AS ENUM ('OVERVIEW', 'ETICHETE', 'DETERIORARI', 'FACTURA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- SECTION 2: EXTEND GoodsReceiptStatus ENUM
-- =============================================

-- Add new values to GoodsReceiptStatus enum
DO $$ BEGIN
    ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'GENERAT';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'TRIMIS_OFFICE';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'VERIFICAT';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'APROBAT';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'IN_STOC';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'RESPINS';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- SECTION 3: CREATE NEW TABLES
-- =============================================

-- 3.1 purchase_orders (Precomanda)
CREATE TABLE IF NOT EXISTS "purchase_orders" (
    "id" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "expected_date" TIMESTAMP(3),
    "notes" TEXT,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_quantity" DECIMAL(10, 3) NOT NULL DEFAULT 0,
    "total_value" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "approved_by" TEXT,
    "approved_by_name" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- 3.2 purchase_order_items (Linie precomanda)
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "quantity_ordered" DECIMAL(10, 3) NOT NULL,
    "unit_price" DECIMAL(10, 2),
    "total_price" DECIMAL(12, 2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- 3.3 purchase_order_labels (Etichete scanabile)
CREATE TABLE IF NOT EXISTS "purchase_order_labels" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "label_code" TEXT NOT NULL,
    "printed" BOOLEAN NOT NULL DEFAULT false,
    "printed_at" TIMESTAMP(3),
    "printed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_labels_pkey" PRIMARY KEY ("id")
);

-- 3.4 supplier_invoices (Factura furnizor) - must be created before reception_reports due to FK
CREATE TABLE IF NOT EXISTS "supplier_invoices" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "invoice_series" TEXT,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "total_value" DECIMAL(12, 2) NOT NULL,
    "vat_value" DECIMAL(12, 2),
    "total_with_vat" DECIMAL(12, 2),
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'NEPLATITA',
    "payment_due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "document_path" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- 3.5 reception_reports (PV Receptie)
CREATE TABLE IF NOT EXISTS "reception_reports" (
    "id" TEXT NOT NULL,
    "report_number" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "supplier_invoice_id" TEXT,
    "status" "ReceptionReportStatus" NOT NULL DEFAULT 'DESCHIS',
    "warehouse_user_id" TEXT NOT NULL,
    "warehouse_user_name" TEXT NOT NULL,
    "has_differences" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMP(3),
    "finalized_by" TEXT,
    "finalized_by_name" TEXT,
    "signature_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reception_reports_pkey" PRIMARY KEY ("id")
);

-- 3.6 reception_report_items (Linie PV receptie)
CREATE TABLE IF NOT EXISTS "reception_report_items" (
    "id" TEXT NOT NULL,
    "reception_report_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "quantity_expected" DECIMAL(10, 3) NOT NULL,
    "quantity_received" DECIMAL(10, 3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "has_difference" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reception_report_items_pkey" PRIMARY KEY ("id")
);

-- 3.7 reception_photos (Poze receptie)
CREATE TABLE IF NOT EXISTS "reception_photos" (
    "id" TEXT NOT NULL,
    "reception_report_id" TEXT NOT NULL,
    "category" "PhotoCategory" NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reception_photos_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- SECTION 4: ADD UNIQUE CONSTRAINTS
-- =============================================

-- purchase_orders unique constraints
DO $$ BEGIN
    ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_document_number_key" UNIQUE ("document_number");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- purchase_order_items unique constraints
DO $$ BEGIN
    ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_inventory_item_id_key" UNIQUE ("purchase_order_id", "inventory_item_id");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- purchase_order_labels unique constraints
DO $$ BEGIN
    ALTER TABLE "purchase_order_labels" ADD CONSTRAINT "purchase_order_labels_label_code_key" UNIQUE ("label_code");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- supplier_invoices unique constraints
DO $$ BEGIN
    ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_invoice_number_invoice_series_key" UNIQUE ("supplier_id", "invoice_number", "invoice_series");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- reception_reports unique constraints
DO $$ BEGIN
    ALTER TABLE "reception_reports" ADD CONSTRAINT "reception_reports_report_number_key" UNIQUE ("report_number");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- reception_report_items unique constraints
DO $$ BEGIN
    ALTER TABLE "reception_report_items" ADD CONSTRAINT "reception_report_items_reception_report_id_inventory_item_id_key" UNIQUE ("reception_report_id", "inventory_item_id");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- SECTION 5: ADD COLUMNS TO EXISTING TABLES
-- =============================================

-- Add new columns to goods_receipts table
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "reception_report_id" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "supplier_invoice_id" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "has_differences" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "differences_approved_by" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "differences_approved_by_name" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "differences_approved_at" TIMESTAMP(3);
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "sent_to_office_at" TIMESTAMP(3);
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "verified_by" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "verified_by_name" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "transferred_to_stock_at" TIMESTAMP(3);

-- Add unique constraint for reception_report_id on goods_receipts
DO $$ BEGIN
    ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_reception_report_id_key" UNIQUE ("reception_report_id");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- SECTION 6: ADD FOREIGN KEY CONSTRAINTS
-- =============================================

-- purchase_orders.supplier_id -> suppliers.id
DO $$ BEGIN
    ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey"
        FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- purchase_order_items.purchase_order_id -> purchase_orders.id (CASCADE DELETE)
DO $$ BEGIN
    ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey"
        FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- purchase_order_items.inventory_item_id -> inventory_items.id
DO $$ BEGIN
    ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inventory_item_id_fkey"
        FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- purchase_order_labels.purchase_order_id -> purchase_orders.id (CASCADE DELETE)
DO $$ BEGIN
    ALTER TABLE "purchase_order_labels" ADD CONSTRAINT "purchase_order_labels_purchase_order_id_fkey"
        FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- supplier_invoices.supplier_id -> suppliers.id
DO $$ BEGIN
    ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_fkey"
        FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- supplier_invoices.purchase_order_id -> purchase_orders.id
DO $$ BEGIN
    ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_purchase_order_id_fkey"
        FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- reception_reports.purchase_order_id -> purchase_orders.id
DO $$ BEGIN
    ALTER TABLE "reception_reports" ADD CONSTRAINT "reception_reports_purchase_order_id_fkey"
        FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- reception_reports.supplier_invoice_id -> supplier_invoices.id
DO $$ BEGIN
    ALTER TABLE "reception_reports" ADD CONSTRAINT "reception_reports_supplier_invoice_id_fkey"
        FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- reception_report_items.reception_report_id -> reception_reports.id (CASCADE DELETE)
DO $$ BEGIN
    ALTER TABLE "reception_report_items" ADD CONSTRAINT "reception_report_items_reception_report_id_fkey"
        FOREIGN KEY ("reception_report_id") REFERENCES "reception_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- reception_report_items.inventory_item_id -> inventory_items.id
DO $$ BEGIN
    ALTER TABLE "reception_report_items" ADD CONSTRAINT "reception_report_items_inventory_item_id_fkey"
        FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- reception_photos.reception_report_id -> reception_reports.id (CASCADE DELETE)
DO $$ BEGIN
    ALTER TABLE "reception_photos" ADD CONSTRAINT "reception_photos_reception_report_id_fkey"
        FOREIGN KEY ("reception_report_id") REFERENCES "reception_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- goods_receipts.reception_report_id -> reception_reports.id
DO $$ BEGIN
    ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_reception_report_id_fkey"
        FOREIGN KEY ("reception_report_id") REFERENCES "reception_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- goods_receipts.supplier_invoice_id -> supplier_invoices.id
DO $$ BEGIN
    ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_invoice_id_fkey"
        FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- SECTION 7: CREATE INDEXES
-- =============================================

-- purchase_orders indexes
CREATE INDEX IF NOT EXISTS "purchase_orders_status_idx" ON "purchase_orders"("status");
CREATE INDEX IF NOT EXISTS "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_expected_date_idx" ON "purchase_orders"("expected_date");

-- purchase_order_items indexes
CREATE INDEX IF NOT EXISTS "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "purchase_order_items_inventory_item_id_idx" ON "purchase_order_items"("inventory_item_id");

-- purchase_order_labels indexes
CREATE INDEX IF NOT EXISTS "purchase_order_labels_purchase_order_id_idx" ON "purchase_order_labels"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "purchase_order_labels_label_code_idx" ON "purchase_order_labels"("label_code");

-- supplier_invoices indexes
CREATE INDEX IF NOT EXISTS "supplier_invoices_supplier_id_idx" ON "supplier_invoices"("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_invoices_purchase_order_id_idx" ON "supplier_invoices"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "supplier_invoices_payment_status_idx" ON "supplier_invoices"("payment_status");
CREATE INDEX IF NOT EXISTS "supplier_invoices_invoice_date_idx" ON "supplier_invoices"("invoice_date");

-- reception_reports indexes
CREATE INDEX IF NOT EXISTS "reception_reports_status_idx" ON "reception_reports"("status");
CREATE INDEX IF NOT EXISTS "reception_reports_purchase_order_id_idx" ON "reception_reports"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "reception_reports_warehouse_user_id_idx" ON "reception_reports"("warehouse_user_id");

-- reception_report_items indexes
CREATE INDEX IF NOT EXISTS "reception_report_items_reception_report_id_idx" ON "reception_report_items"("reception_report_id");
CREATE INDEX IF NOT EXISTS "reception_report_items_inventory_item_id_idx" ON "reception_report_items"("inventory_item_id");

-- reception_photos indexes
CREATE INDEX IF NOT EXISTS "reception_photos_reception_report_id_idx" ON "reception_photos"("reception_report_id");
CREATE INDEX IF NOT EXISTS "reception_photos_category_idx" ON "reception_photos"("category");

-- goods_receipts additional indexes
CREATE INDEX IF NOT EXISTS "goods_receipts_reception_report_id_idx" ON "goods_receipts"("reception_report_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_supplier_invoice_id_idx" ON "goods_receipts"("supplier_invoice_id");

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Run RAISE NOTICE to confirm successful execution
DO $$ BEGIN
    RAISE NOTICE 'Reception workflow migration completed successfully.';
    RAISE NOTICE 'Tables created: purchase_orders, purchase_order_items, purchase_order_labels, supplier_invoices, reception_reports, reception_report_items, reception_photos';
    RAISE NOTICE 'Enums created: PurchaseOrderStatus, ReceptionReportStatus, PaymentStatus, PhotoCategory';
    RAISE NOTICE 'GoodsReceiptStatus extended with: GENERAT, TRIMIS_OFFICE, VERIFICAT, APROBAT, IN_STOC, RESPINS';
    RAISE NOTICE 'goods_receipts table extended with 11 new columns';
END $$;
