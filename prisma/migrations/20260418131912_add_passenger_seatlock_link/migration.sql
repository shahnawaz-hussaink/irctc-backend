/*
  Warnings:

  - A unique constraint covering the columns `[seatLockId]` on the table `PassengerInfo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seatLockId` to the `PassengerInfo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "passengerStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'WAITING');

-- AlterTable
ALTER TABLE "PassengerInfo" ADD COLUMN     "passengerStatus" "passengerStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "seatLockId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PassengerInfo_seatLockId_key" ON "PassengerInfo"("seatLockId");

-- AddForeignKey
ALTER TABLE "PassengerInfo" ADD CONSTRAINT "PassengerInfo_seatLockId_fkey" FOREIGN KEY ("seatLockId") REFERENCES "SeatLock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
