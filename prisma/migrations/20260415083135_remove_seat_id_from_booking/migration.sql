/*
  Warnings:

  - You are about to drop the column `seatId` on the `Booking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_seatId_fkey";

-- DropIndex
DROP INDEX "Booking_seatId_scheduleId_key";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "seatId";
