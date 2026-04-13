import prisma from "../db/prisma.js";

const seatCleanup = async () => {
    const deleted = await prisma.seatLock.deleteMany({
        where: {
            status: "HELD",
            heldUntil: { lt: new Date() },
        },
    });
    console.log(`Cleaned up ${deleted.count} expired seat locks`);
};

export default seatCleanup;