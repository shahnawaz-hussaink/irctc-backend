/*
  Warnings:

  - Added the required column `createdAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL;
