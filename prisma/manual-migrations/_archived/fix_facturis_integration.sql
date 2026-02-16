-- Migration: Fix Facturis Integration Issues
-- Descriere: Corectează problemele de integrare Facturis găsite după migrarea de la SmartBill
-- Data: 2026-01-21

-- ============================================================================
-- 1. CORECTARE invoiceProvider
-- ============================================================================
-- Actualizează toate facturile care au invoiceProvider = 'smartbill' sau NULL la 'facturis'
-- Aceasta corectează inconsistența din migrația inițială

UPDATE "invoices"
SET "invoiceProvider" = 'facturis'
WHERE "invoiceProvider" = 'smartbill' OR "invoiceProvider" IS NULL;

-- Setează default corect (dacă nu era deja setat)
ALTER TABLE "invoices"
ALTER COLUMN "invoiceProvider" SET DEFAULT 'facturis';

-- ============================================================================
-- 2. ADAUGARE INDEX PE facturisId
-- ============================================================================
-- Index pentru căutări rapide după facturisId (folosit la anulare facturi, download PDF)

CREATE INDEX IF NOT EXISTS "invoices_facturisId_idx" ON "invoices"("facturisId");

-- Opțional: unique constraint (comentat - poate fi necesar să existe duplicate temporar)
-- CREATE UNIQUE INDEX IF NOT EXISTS "invoices_facturisId_key" ON "invoices"("facturisId") WHERE "facturisId" IS NOT NULL;

-- ============================================================================
-- 3. VERIFICARE ȘI CURĂȚARE DATE
-- ============================================================================
-- Verifică dacă există facturi fără companyId dar cu facturisId (ar indica o problemă)
-- SELECT id, "invoiceNumber", "facturisId", "companyId"
-- FROM "invoices"
-- WHERE "facturisId" IS NOT NULL AND "companyId" IS NULL;

-- ============================================================================
-- 4. NOTIȚE PENTRU ADMINISTRATORI
-- ============================================================================
-- După rularea acestei migrații:
-- 1. Verifică că toate facturile au invoiceProvider = 'facturis'
-- 2. Verifică că indexul pe facturisId a fost creat
-- 3. Repornește aplicația pentru a prelua schimbările

-- Query de verificare:
-- SELECT "invoiceProvider", COUNT(*) FROM "invoices" GROUP BY "invoiceProvider";
-- SELECT indexname FROM pg_indexes WHERE tablename = 'invoices' AND indexname LIKE '%facturis%';

-- Done!
