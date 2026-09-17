-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "tags" TEXT;

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" SERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createAt_idx" ON "OutboxEvent"("status", "createAt");
