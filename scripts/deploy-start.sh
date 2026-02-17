#!/bin/bash
set -e

# 1. Resolve any failed migrations (e.g. manually applied SQL)
echo "Resolving failed migrations..."
npx prisma migrate resolve --applied 20260217_add_repair_invoices 2>/dev/null || true

# 2. Run Prisma migrations (MUST succeed or app won't start)
echo "Running Prisma migrations..."
npx prisma migrate deploy

# 2. Run custom manual migrations
echo "Running custom migrations..."
node scripts/force-migration.js

# 3. Backfill postal codes (optional, ignore errors)
echo "Running postal code backfill..."
LIMIT=5 npm run backfill:postal-codes || echo "Backfill skipped"

# 4. Start the app
echo "Starting application..."
NODE_OPTIONS="--max-old-space-size=4096" npm run start
