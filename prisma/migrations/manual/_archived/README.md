# Archived Migrations

These migrations have been archived because they are no longer needed or have been superseded by newer migrations.

## Why Archived?

1. **fix_facturis_integration.sql** - Sets invoiceProvider to 'facturis' which is outdated. Facturis was replaced with Oblio.

2. **migrate_facturis_to_oblio.sql** - One-time migration that renamed Facturis columns to Oblio columns. Already executed and would fail on re-run.

3. **remove_smartbill_columns.sql** - Removes SmartBill columns that were already removed. Would cause "column does not exist" errors.

## Important

Do NOT move these files back to the parent folder. The `add_multi_company_support.sql` has been updated to use the correct Oblio column names directly.
