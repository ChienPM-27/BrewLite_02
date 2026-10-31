-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('MOCK', 'VNPAY');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gateway" "PaymentGateway" NOT NULL DEFAULT 'MOCK',
ADD COLUMN     "gateway_transaction_no" TEXT,
ADD COLUMN     "payment_url" TEXT;
