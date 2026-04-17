import redisConnection from "../config/redis.config.js";
import { Worker } from "bullmq";
import prisma from "../db/prisma.js";
import getTenMinTime from "../utils/getTenMinutesTime.js";

const waitingListWorker = new Worker(
    "waitingListQueue",
    async (job) => {
        const { type, data } = job.data;

        if (type === "CANCELLATION") {
            const { scheduleId, coachType } = data;

            await prisma.$transaction(async (txn) => {
                const schedule = await txn.schedule.findFirst({
                    where: { id: scheduleId },
                });
                while (true) {
                    const nextWaiting = await txn.booking.findFirst({
                        where: { scheduleId, coachType, status: "WAITING" },
                        orderBy: { createdAt: "asc" },
                    });

                    if (!nextWaiting) break;

                    const seat = await txn.seat.findFirst({
                        where: {
                            coach: {
                                trainId: schedule.trainId,
                                coachType,
                            },
                            seatLock: {
                                none: {
                                    scheduleId,
                                    status: { in: ["HELD", "BOOKED"] },
                                },
                            },
                        },
                        take: 1,
                    });

                    if (!seat) {
                        break;
                    }

                    const updatedBooking = await txn.booking.updateMany({
                        where: { id: nextWaiting.id },
                        data: { status: "BOOKED" },
                    });

                    if (updatedBooking.count === 0) {
                        continue;
                    }

                    await txn.seatLock.create({
                        data: {
                            userId: nextWaiting.userId,
                            seatId: seat.id,
                            scheduleId: schedule.id,
                            status: "BOOKED",
                            heldUntil: getTenMinTime(),
                            bookingId: nextWaiting.id,
                        },
                    });
                }
            });

            console.log("Waiting List workedd ");
        }
    },
    { connection: redisConnection, concurrency: 1 }
);
waitingListWorker.on("completed", (job) => console.log(`Job ${job.id} done`));
waitingListWorker.on("failed", (job, err) =>
    console.error(`Job ${job.id} failed:`, err)
);

export default waitingListWorker;
