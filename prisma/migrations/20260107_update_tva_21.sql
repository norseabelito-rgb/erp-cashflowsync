-- Migration: Update TVA default from 19% to 21%
-- Date: 2026-01-07
-- Context: TVA în România a crescut de la 19% la 21%

-- Actualizează valoarea default în DB pentru setările existente
-- DOAR dacă valoarea curentă este 19 (vechiul default)
UPDATE "settings" 
SET "smartbillTaxPercent" = 21 
WHERE "smartbillTaxPercent" = 19;

-- Alternativ, pentru a forța 21% indiferent de valoarea curentă:
-- UPDATE "settings" SET "smartbillTaxPercent" = 21;

-- Verifică rezultatul:
-- SELECT "smartbillTaxName", "smartbillTaxPercent" FROM "settings";
