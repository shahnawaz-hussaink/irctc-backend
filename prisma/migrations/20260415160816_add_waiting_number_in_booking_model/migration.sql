/*
  Warnings:

  - A unique constraint covering the columns `[seatId,scheduleId]` on the table `SeatLock` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "bookingStatus" ADD VALUE 'WAITING';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "waitingNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Booking_scheduleId_status_idx" ON "Booking"("scheduleId", "status");

-- CreateIndex
CREATE INDEX "Booking_scheduleId_waitingNumber_idx" ON "Booking"("scheduleId", "waitingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SeatLock_seatId_scheduleId_key" ON "SeatLock"("seatId", "scheduleId");
