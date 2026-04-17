/*
  Warnings:

  - You are about to drop the column `waitingNumber` on the `Booking` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Booking_scheduleId_waitingNumber_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "waitingNumber";
