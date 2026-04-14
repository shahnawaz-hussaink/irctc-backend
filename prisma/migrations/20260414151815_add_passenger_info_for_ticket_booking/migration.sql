-- CreateEnum
CREATE TYPE "passengerGender" AS ENUM ('MALE', 'FEMALE', 'TRANSGENDER');

-- CreateTable
CREATE TABLE "PassengerInfo" (
    "id" SERIAL NOT NULL,
    "passengerName" TEXT NOT NULL,
    "passengerAge" INTEGER NOT NULL,
    "passengerGender" "passengerGender" NOT NULL,
    "bookingId" INTEGER NOT NULL,

    CONSTRAINT "PassengerInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassengerInfo_id_key" ON "PassengerInfo"("id");

-- AddForeignKey
ALTER TABLE "PassengerInfo" ADD CONSTRAINT "PassengerInfo_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
