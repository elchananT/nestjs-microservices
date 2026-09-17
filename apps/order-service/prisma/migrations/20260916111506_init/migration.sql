-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
