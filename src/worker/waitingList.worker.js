import redisConnection from "../config/redis.config.js";
import { Worker } from "bullmq";
import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import getTenMinTime from "../utils/getTenMinutesTime.js";

const waitingListWorker = new Worker(
    "waitingListQueue",
    async (job) => {
        const { type, data } = job.data;

        if (type === "CANCELLATION") {
            const { scheduleId, coachType } = data;

            await prisma.$transaction(async (txn) => {
                const nextWaiting = await txn.booking.findFirst({
                    where: { scheduleId, coachType, status: "WAITING" },
                    orderBy: { waitingNumber: "asc" },
                });

                if (!nextWaiting) {
                    return;
                }

                const schedule = await txn.schedule.findFirst({
                    where: { id: scheduleId },
                });

                const seat = await txn.seat.findFirst({
                    where: {
                        coach: {
                            trainId: schedule.trainId,
                            coachType,
                        },
                        seatLock: {
                            none: { scheduleId, status: { not: "CANCELLED" } },
                        },
                    },
                    take: 1,
                });

                if (!seat) {
                    return;
                }

                const booking = await txn.booking.update({
                    where: { id: nextWaiting.id },
                    data: { status: "BOOKED", waitingNumber: null },
                });

                if (!booking) {
                    return;
                }

                await txn.seatLock.create({
                    data: {
                        userId: booking.userId,
                        seatId: seat.id,
                        scheduleId: schedule.id,
                        status: "BOOKED",
                        heldUntil: getTenMinTime(),
                        bookingId: booking.id,
                    },
                });
            });

            console.log("I ran in waitinlistworker ");
        }
    },
    { connection: redisConnection, concurrency: 1 }
);
waitingListWorker.on("completed", (job) => console.log(`Job ${job.id} done`));
waitingListWorker.on("failed", (job, err) =>
    console.error(`Job ${job.id} failed:`, err)
);

export default waitingListWorker;
