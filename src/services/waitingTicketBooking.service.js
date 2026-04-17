import prisma from "../db/prisma.js";

// const waitingTicketBooking = async (
//     txn,
//     userId,
//     scheduleId,
//     passengers,
//     coachType
// ) => {
//     const lastWaitingBooking = await txn.booking.findFirst({
//         where: { scheduleId, status: "WAITING" },
//         orderBy: { waitingNumber: "desc" },
//     });

//     const waitingNumber = lastWaitingBooking
//         ? lastWaitingBooking.waitingNumber + 1
//         : 1;

//     const booking = await txn.booking.create({
//         data: {
//             userId,
//             scheduleId,
//             waitingNumber,
//             createdAt: new Date(Date.now()),
//             status: "HELD",
//             coachType,
//         },
//     });

//     const passengerData = passengers.map((p) => ({
//         ...p,
//         bookingId: booking.id,
//     }));

//     await txn.passengerInfo.createMany({
//         data: passengerData,
//     });

//     console.log("Waiting Booking");
//     return booking;
// };

// waitingTicketBooking.js
const waitingTicketBooking = async (txn, userId, scheduleId, passengers, coachType) => {
    const lastWaiting = await txn.booking.findFirst({
        where: { scheduleId, status: "WAITING" },
        orderBy: { waitingNumber: "desc" },
    });
    const waitingNumber = lastWaiting ? lastWaiting.waitingNumber + 1 : 1;

    const booking = await txn.booking.create({
        data: { userId, scheduleId, waitingNumber, coachType, status: "WAITING", createdAt: new Date() },
    });
    const passengerData = passengers.map((p) => ({ ...p, bookingId: booking.id }));
    await txn.passengerInfo.createMany({ data: passengerData });

    return booking;
};



export { waitingTicketBooking };
