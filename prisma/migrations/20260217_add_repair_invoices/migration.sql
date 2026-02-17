-- CreateTable
CREATE TABLE "repair_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceSeriesName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "oblioClient" TEXT NOT NULL,
    "correctCustomer" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "issuedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "newInvoiceNumber" TEXT,
    "newInvoiceSeries" TEXT,
    "repairedAt" TIMESTAMP(3),
    "repairedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repair_invoices_invoiceSeriesName_invoiceNumber_companyId_key" ON "repair_invoices"("invoiceSeriesName", "invoiceNumber", "companyId");

-- CreateIndex
CREATE INDEX "repair_invoices_status_idx" ON "repair_invoices"("status");

-- CreateIndex
CREATE INDEX "repair_invoices_orderId_idx" ON "repair_invoices"("orderId");

-- AddForeignKey
ALTER TABLE "repair_invoices" ADD CONSTRAINT "repair_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_invoices" ADD CONSTRAINT "repair_invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
