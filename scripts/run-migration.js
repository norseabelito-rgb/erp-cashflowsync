/**
 * Script pentru a rula migrarea SQL direct prin Prisma
 * Folosire: railway run node scripts/run-migration.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting multi-company migration...\n');

  try {
    // 1. Create companies table
    console.log('1. Creating companies table...');
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('   ✅ companies table created');

    // Create indexes for companies
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "companies_name_key" ON "companies"("name")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "companies_code_key" ON "companies"("code")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "companies_cif_idx" ON "companies"("cif")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "companies_isPrimary_idx" ON "companies"("isPrimary")`);
    console.log('   ✅ companies indexes created');

    // 2. Create intercompany_invoices table
    console.log('2. Creating intercompany_invoices table...');
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "intercompany_invoices_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('   ✅ intercompany_invoices table created');

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "intercompany_invoices_invoiceNumber_key" ON "intercompany_invoices"("invoiceNumber")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "intercompany_invoices_issuedByCompanyId_idx" ON "intercompany_invoices"("issuedByCompanyId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "intercompany_invoices_receivedByCompanyId_idx" ON "intercompany_invoices"("receivedByCompanyId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "intercompany_invoices_status_idx" ON "intercompany_invoices"("status")`);
    console.log('   ✅ intercompany_invoices indexes created');

    // 3. Create intercompany_order_links table
    console.log('3. Creating intercompany_order_links table...');
    await prisma.$executeRawUnsafe(`
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
      )
    `);
    console.log('   ✅ intercompany_order_links table created');

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "intercompany_order_links_orderId_key" ON "intercompany_order_links"("orderId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "intercompany_order_links_status_idx" ON "intercompany_order_links"("status")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "intercompany_order_links_intercompanyInvoiceId_idx" ON "intercompany_order_links"("intercompanyInvoiceId")`);
    console.log('   ✅ intercompany_order_links indexes created');

    // 4. Add columns to existing tables
    console.log('4. Adding columns to stores...');
    await safeAddColumn('stores', 'companyId', 'TEXT');

    console.log('5. Adding columns to orders...');
    await safeAddColumn('orders', 'billingCompanyId', 'TEXT');
    await safeAddColumn('orders', 'operationalWarehouseId', 'TEXT');
    await safeAddColumn('orders', 'requiredTransferId', 'TEXT');
    await safeAddColumn('orders', 'intercompanyStatus', 'TEXT');

    console.log('6. Adding columns to invoices...');
    await safeAddColumn('invoices', 'companyId', 'TEXT');
    await safeAddColumn('invoices', 'invoiceSeriesId', 'TEXT');
    await safeAddColumn('invoices', 'invoiceProvider', "TEXT DEFAULT 'smartbill'");
    await safeAddColumn('invoices', 'facturisId', 'TEXT');

    console.log('7. Adding columns to awbs...');
    await safeAddColumn('awbs', 'companyId', 'TEXT');
    await safeAddColumn('awbs', 'isCollected', 'BOOLEAN DEFAULT false');
    await safeAddColumn('awbs', 'collectedAt', 'TIMESTAMP(3)');
    await safeAddColumn('awbs', 'collectedAmount', 'DECIMAL(10,2)');

    console.log('8. Adding columns to invoice_series...');
    await safeAddColumn('invoice_series', 'companyId', 'TEXT');
    await safeAddColumn('invoice_series', 'currentNumber', 'INTEGER DEFAULT 1');
    await safeAddColumn('invoice_series', 'numberPadding', 'INTEGER DEFAULT 6');

    console.log('9. Adding columns to warehouses...');
    await safeAddColumn('warehouses', 'isOperational', 'BOOLEAN DEFAULT false');

    console.log('10. Adding columns to warehouse_transfers...');
    await safeAddColumn('warehouse_transfers', 'isAutoProposed', 'BOOLEAN DEFAULT false');
    await safeAddColumn('warehouse_transfers', 'approvedById', 'TEXT');
    await safeAddColumn('warehouse_transfers', 'approvedByName', 'TEXT');
    await safeAddColumn('warehouse_transfers', 'approvedAt', 'TIMESTAMP(3)');
    await safeAddColumn('warehouse_transfers', 'requiredForOrderId', 'TEXT');

    // 11. Add foreign key constraints
    console.log('11. Adding foreign key constraints...');
    await safeAddConstraint('stores', 'stores_companyId_fkey',
      'FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('orders', 'orders_billingCompanyId_fkey',
      'FOREIGN KEY ("billingCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('orders', 'orders_operationalWarehouseId_fkey',
      'FOREIGN KEY ("operationalWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('orders', 'orders_requiredTransferId_fkey',
      'FOREIGN KEY ("requiredTransferId") REFERENCES "warehouse_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('invoices', 'invoices_companyId_fkey',
      'FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('invoices', 'invoices_invoiceSeriesId_fkey',
      'FOREIGN KEY ("invoiceSeriesId") REFERENCES "invoice_series"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('awbs', 'awbs_companyId_fkey',
      'FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('invoice_series', 'invoice_series_companyId_fkey',
      'FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('intercompany_invoices', 'intercompany_invoices_issuedByCompanyId_fkey',
      'FOREIGN KEY ("issuedByCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE');

    await safeAddConstraint('intercompany_invoices', 'intercompany_invoices_receivedByCompanyId_fkey',
      'FOREIGN KEY ("receivedByCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE');

    await safeAddConstraint('intercompany_order_links', 'intercompany_order_links_orderId_fkey',
      'FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE');

    await safeAddConstraint('intercompany_order_links', 'intercompany_order_links_intercompanyInvoiceId_fkey',
      'FOREIGN KEY ("intercompanyInvoiceId") REFERENCES "intercompany_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    await safeAddConstraint('warehouse_transfers', 'warehouse_transfers_requiredForOrderId_fkey',
      'FOREIGN KEY ("requiredForOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE');

    // 12. Create additional indexes
    console.log('12. Creating additional indexes...');
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "orders_requiredTransferId_key" ON "orders"("requiredTransferId")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_transfers_requiredForOrderId_key" ON "warehouse_transfers"("requiredForOrderId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "stores_companyId_idx" ON "stores"("companyId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_billingCompanyId_idx" ON "orders"("billingCompanyId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_operationalWarehouseId_idx" ON "orders"("operationalWarehouseId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_intercompanyStatus_idx" ON "orders"("intercompanyStatus")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "invoices_companyId_idx" ON "invoices"("companyId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "awbs_companyId_idx" ON "awbs"("companyId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "awbs_isCollected_idx" ON "awbs"("isCollected")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "invoice_series_companyId_idx" ON "invoice_series"("companyId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "warehouses_isOperational_idx" ON "warehouses"("isOperational")`);
    console.log('   ✅ All indexes created');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function safeAddColumn(table, column, type) {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
    console.log(`   ✅ ${table}.${column} added`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`   ⏭️  ${table}.${column} already exists, skipping`);
    } else {
      throw error;
    }
  }
}

async function safeAddConstraint(table, constraintName, definition) {
  try {
    // Check if constraint exists
    const result = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = ${constraintName} AND table_name = ${table}
    `;

    if (result.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" ${definition}`);
      console.log(`   ✅ ${constraintName} added`);
    } else {
      console.log(`   ⏭️  ${constraintName} already exists, skipping`);
    }
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`   ⏭️  ${constraintName} already exists, skipping`);
    } else {
      console.error(`   ⚠️  Error adding ${constraintName}:`, error.message);
    }
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
