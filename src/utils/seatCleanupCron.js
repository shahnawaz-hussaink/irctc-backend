import prisma from "../db/prisma.js";

const seatCleanup = async () => {
    const deletedSeat = await prisma.seatLock.deleteMany({
        where: {
            status: "HELD",
            heldUntil: { lt: new Date() },
        },
    });
    const passengerClean = await prisma.passengerInfo.deleteMany({
        where: {
            booking: {
                status: { in: ["HELD", "WAITING_HELD"] },
                createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
            },
        },
    });
    const bookingClean = await prisma.booking.deleteMany({
        where: {
            status: { in: ["HELD", "WAITING_HELD"] },
            createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
        },
    });
    
    console.log(deletedSeat, passengerClean, bookingClean);
};

export default seatCleanup;
