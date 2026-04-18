-- DropForeignKey
ALTER TABLE "PassengerInfo" DROP CONSTRAINT "PassengerInfo_seatLockId_fkey";

-- AlterTable
ALTER TABLE "PassengerInfo" ALTER COLUMN "seatLockId" DROP NOT NULL,
ALTER COLUMN "seatLockId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "PassengerInfo" ADD CONSTRAINT "PassengerInfo_seatLockId_fkey" FOREIGN KEY ("seatLockId") REFERENCES "SeatLock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
