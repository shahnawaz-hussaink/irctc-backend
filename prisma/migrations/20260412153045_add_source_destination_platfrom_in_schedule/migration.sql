/*
  Warnings:

  - You are about to drop the column `platformId` on the `Schedule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[seatId,scheduleId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `destinationPlatformId` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourcePlatformId` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_platformId_fkey";

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "platformId",
ADD COLUMN     "destinationPlatformId" INTEGER NOT NULL,
ADD COLUMN     "sourcePlatformId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_seatId_scheduleId_key" ON "Booking"("seatId", "scheduleId");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_sourcePlatformId_fkey" FOREIGN KEY ("sourcePlatformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_destinationPlatformId_fkey" FOREIGN KEY ("destinationPlatformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
