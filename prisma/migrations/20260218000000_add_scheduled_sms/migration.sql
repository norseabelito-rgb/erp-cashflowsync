-- CreateTable
CREATE TABLE "scheduled_sms" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "orderId" TEXT,
    "awbNumber" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_sms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_sms_scheduledAt_sentAt_idx" ON "scheduled_sms"("scheduledAt", "sentAt");
