import prisma from "../db/prisma.js";

const seatCleanup = async () => {
    const expiredSeatLocks = await prisma.seatLock.findMany({
        where: {
            status: { in: ["HELD", "CANCELLED"] },
            heldUntil: { lt: new Date() },
        },
        select: { id: true },
    });

    const expiredSeatLocksIds = expiredSeatLocks.map((s) => s.id);

    if (expiredSeatLocksIds.length === 0) {
        console.log("No expired SeatLock to remove");
        return;
    }

    const [passengerClean, deletedSeat, bookingClean] =
        await prisma.$transaction([
            prisma.passengerInfo.deleteMany({
                where: {
                    seatLockId: { in: expiredSeatLocksIds },
                },
            }),
            prisma.seatLock.deleteMany({
                where: {
                    id: { in: expiredSeatLocksIds },
                },
            }),
            prisma.booking.deleteMany({
                where: {
                    status: { in: ["HELD", "WAITING_HELD"] },
                    createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
                },
            }),
        ]);

    console.log({ passengerClean, deletedSeat, bookingClean });
};

export default seatCleanup;
