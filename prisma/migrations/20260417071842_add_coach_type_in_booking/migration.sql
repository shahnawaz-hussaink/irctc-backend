/*
  Warnings:

  - Added the required column `coachType` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "coachType" TEXT NOT NULL;
