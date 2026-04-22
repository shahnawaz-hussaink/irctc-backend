-- DropForeignKey
ALTER TABLE "PassengerInfo" DROP CONSTRAINT "PassengerInfo_bookingId_fkey";

-- AddForeignKey
ALTER TABLE "PassengerInfo" ADD CONSTRAINT "PassengerInfo_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
