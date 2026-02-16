#!/bin/bash
set -e

# 1. Run Prisma migrations (MUST succeed or app won't start)
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
npm run start
