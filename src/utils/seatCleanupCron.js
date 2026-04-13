import prisma from "../db/prisma.js";

const seatCleanup = async () => {
    prisma.seatLock.deleteMany({
        where: {
            status: "HELD",
            heldUntil: { lt: new Date() },
        },
    });
};

export default seatCleanup;
