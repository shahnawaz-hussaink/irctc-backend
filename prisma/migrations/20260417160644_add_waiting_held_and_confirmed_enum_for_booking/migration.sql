/*
  Warnings:

  - The values [BOOKED] on the enum `bookingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "bookingStatus_new" AS ENUM ('HELD', 'CANCELLED', 'WAITING_HELD', 'WAITING', 'CONFIRMED', 'PARTIAL_CONFIRMED');
ALTER TABLE "public"."Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "bookingStatus_new" USING ("status"::text::"bookingStatus_new");
ALTER TYPE "bookingStatus" RENAME TO "bookingStatus_old";
ALTER TYPE "bookingStatus_new" RENAME TO "bookingStatus";
DROP TYPE "public"."bookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'HELD';
COMMIT;
