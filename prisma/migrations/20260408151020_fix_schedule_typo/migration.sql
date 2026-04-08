/*
  Warnings:

  - You are about to drop the column `arrivaltime` on the `Schedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "arrivaltime",
ADD COLUMN     "arrivalTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
