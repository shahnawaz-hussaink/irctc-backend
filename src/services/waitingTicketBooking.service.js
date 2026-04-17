import prisma from "../db/prisma.js";

// waitingTicketBooking.js
const waitingTicketBooking = async (
    txn,
    userId,
    scheduleId,
    passengers,
    coachType
) => {
    const booking = await txn.booking.create({
        data: {
            userId,
            scheduleId,
            coachType,
            status: "WAITING",
            createdAt: new Date(),
        },
    });
    const passengerData = passengers.map((p) => ({
        ...p,
        bookingId: booking.id,
    }));
    await txn.passengerInfo.createMany({ data: passengerData });

    return booking;
};

export { waitingTicketBooking };
