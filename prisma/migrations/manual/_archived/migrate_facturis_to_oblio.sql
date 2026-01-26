-- Migration: Replace Facturis with Oblio
-- Date: 2026-01-24
-- Description: Rename Facturis columns to Oblio columns in Company, Invoice, and InvoiceSeries tables

-- =============================================
-- COMPANY TABLE - Rename credential columns
-- =============================================

-- Rename facturisApiKey to oblioEmail (repurpose - email is used for auth in Oblio)
ALTER TABLE companies RENAME COLUMN "facturisApiKey" TO "oblioEmail";

-- Rename facturisPassword to oblioSecretToken
ALTER TABLE companies RENAME COLUMN "facturisPassword" TO "oblioSecretToken";

-- Rename facturisCompanyCif to oblioCif
ALTER TABLE companies RENAME COLUMN "facturisCompanyCif" TO "oblioCif";

-- Drop facturisUsername (not needed in Oblio - uses email instead)
ALTER TABLE companies DROP COLUMN IF EXISTS "facturisUsername";

-- =============================================
-- INVOICE TABLE - Rename external ID column
-- =============================================

-- Rename facturisId to oblioId
ALTER TABLE invoices RENAME COLUMN "facturisId" TO "oblioId";

-- Update default provider from 'facturis' to 'oblio'
UPDATE invoices SET "invoiceProvider" = 'oblio' WHERE "invoiceProvider" = 'facturis';

-- =============================================
-- INVOICE_SERIES TABLE - Rename sync columns
-- =============================================

-- Rename syncToFacturis to syncToOblio
ALTER TABLE invoice_series RENAME COLUMN "syncToFacturis" TO "syncToOblio";

-- Rename facturisSeries to oblioSeries
ALTER TABLE invoice_series RENAME COLUMN "facturisSeries" TO "oblioSeries";

-- =============================================
-- CLEAR OLD DATA
-- =============================================

-- Clear old credential data (users will need to re-enter Oblio credentials)
UPDATE companies SET
  "oblioEmail" = NULL,
  "oblioSecretToken" = NULL,
  "oblioCif" = NULL;

-- Done!
-- Users will need to:
-- 1. Go to Settings > Companies
-- 2. Enter Oblio credentials (Email, Secret Token from Oblio Settings > Account Data)
-- 3. Test connection
