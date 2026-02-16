-- Creare tabel pentru incercari esuate de emitere factura (pentru retry ulterior)
-- Ruleaza manual pe baza de date live

CREATE TABLE IF NOT EXISTS "failed_invoice_attempts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "errorCode" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "storeId" TEXT,
    "storeName" TEXT,
    "companyId" TEXT,
    "companyName" TEXT,
    "seriesId" TEXT,
    "seriesName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retriedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failed_invoice_attempts_pkey" PRIMARY KEY ("id")
);

-- Index-uri pentru performanta
CREATE INDEX IF NOT EXISTS "failed_invoice_attempts_orderId_idx" ON "failed_invoice_attempts"("orderId");
CREATE INDEX IF NOT EXISTS "failed_invoice_attempts_status_idx" ON "failed_invoice_attempts"("status");
CREATE INDEX IF NOT EXISTS "failed_invoice_attempts_createdAt_idx" ON "failed_invoice_attempts"("createdAt");

-- Foreign key catre Order
ALTER TABLE "failed_invoice_attempts"
ADD CONSTRAINT "failed_invoice_attempts_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
