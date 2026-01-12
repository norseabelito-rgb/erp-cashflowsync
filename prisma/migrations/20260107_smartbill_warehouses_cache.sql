-- Migration: Add SmartBill warehouses cache
-- Date: 2026-01-07
-- Fix: SmartBill settings not persisting after page refresh

-- Add warehouses cache column to settings table
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smartbillWarehousesCache" TEXT;

-- Note: Run this with:
-- psql $DATABASE_URL < prisma/migrations/20260107_smartbill_warehouses_cache.sql
-- or include it in your next prisma db push
