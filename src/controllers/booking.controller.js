import prisma from "../db/prisma.js";
import myWaitingListQueue from "../queues/waitingList.queue.js";
import bookingConfirmationMail from "../services/bookingConfirmationMail.service.js";
import { waitingTicketBooking } from "../services/waitingTicketBooking.service.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import getTenMinTime from "../utils/getTenMinutesTime.js";
import isValidPnr from "../utils/isValidPnr.js";

const bookSeat = asyncHandler(async (req, res) => {
    const coachType = req.params.coachType;
    const scheduleId = parseInt(req.params.scheduleId);
    const { passenger1, passenger2, passenger3, passenger4, passenger5 } =
        req.body;

    const passengers = [
        passenger1,
        passenger2,
        passenger3,
        passenger4,
        passenger5,
    ].filter(Boolean);

    if (!coachType || !scheduleId) {
        throw new ApiError(400, "Wrong Route , Check Route detials");
    }

    if (passengers.length === 0) {
        throw new ApiError(400, "No Passenger Provided");
    }

    const isScheduleExist = await prisma.schedule.findFirst({
        where: { id: scheduleId },
    });

    if (!isScheduleExist) {
        throw new ApiError(404, "No Schedule Found");
    }

    const booking = await prisma.$transaction(async (txn) => {
        const seat = await txn.seat.findMany({
            where: {
                coach: {
                    trainId: isScheduleExist.trainId,
                    coachType,
                },
                seatLock: {
                    none: {
                        scheduleId,
                        status: { not: "CANCELLED" },
                    },
                },
            },
            take: passengers.length,
        });

        const isWaitingBookingExist = await txn.booking.findFirst({
            where: { scheduleId, status: "WAITING" },
            orderBy: { createdAt: "desc" },
        });

        if (seat.length <= 0 || isWaitingBookingExist) {
            const waitingBooking = await waitingTicketBooking(
                txn,
                req.user.id,
                scheduleId,
                passengers,
                coachType
            );
            return { type: "WAITING", data: waitingBooking };
        }

        if (seat.length < passengers.length) {
            throw new ApiError(400, "Limited Seats avaliable only");
        }

        const seatIds = seat.map((seats) => seats.id);
        if (seatIds.length <= 0) {
            throw new ApiError(400, "Seats not available");
        }

        await txn.$queryRaw`SELECT * FROM "Seat" WHERE  id= ANY(${seatIds}::int[]) FOR UPDATE`;

        const isAlreadyBooked = await txn.seatLock.findMany({
            where: {
                seatId: { in: seatIds },
                scheduleId,
                status: { not: "CANCELLED" },
            },
        });

        if (isAlreadyBooked.length > 0) {
            throw new ApiError(400, "Seat just Booked BY another USER");
        }

        const newBooking = await txn.booking.create({
            data: {
                userId: req.user?.id,
                scheduleId,
                status: "HELD",
                createdAt: new Date(Date.now()),
                coachType,
            },
        });

        const seatLockData = seatIds.map((seatId) => ({
            userId: req.user?.id,
            seatId,
            scheduleId,
            status: "HELD",
            heldUntil: getTenMinTime(),
            bookingId: newBooking.id,
        }));

        const createdSeatLocks = await txn.seatLock.createManyAndReturn({
            data: seatLockData,
        });

        const passengerData = passengers.map((passenger, idx) => ({
            ...passenger,
            bookingId: newBooking.id,
            seatLockId: createdSeatLocks[idx].id,
            createdAt: new Date(Date.now()),
        }));

        await txn.passengerInfo.createMany({
            data: passengerData,
        });

        if (!newBooking) {
            throw new ApiError(
                500,
                "Something went wrong while Booking your Seat"
            );
        }

        return newBooking;
    });

    const User = await prisma.user.findFirst({
            where: { id: req.user.id },
        });

        console.log("i ran 1")
        await bookingConfirmationMail(User.email, booking.id);

    
    return res.status(200).json(new ApiResponse(200, booking, "Seat Booked"));
});

const getBooking = asyncHandler(async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);

    if (!bookingId) {
        throw new ApiError(400, "Booking Id Required");
    }

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            status: true,
            passengerInfo: {
                select: {
                    passengerName: true,
                    passengerAge: true,
                    passengerGender: true,
                },
            },
            schedule: {
                select: {
                    arrivalTime: true,
                    departureTime: true,
                    date: true,
                    sourcePlatform: {
                        select: {
                            platformNumber: true,
                            station: {
                                select: {
                                    stationName: true,
                                    stationCode: true,
                                },
                            },
                        },
                    },
                    destinationPlatform: {
                        select: {
                            platformNumber: true,
                            station: {
                                select: {
                                    stationName: true,
                                    stationCode: true,
                                },
                            },
                        },
                    },
                    train: {
                        select: {
                            trainNumber: true,
                            trainName: true,
                        },
                    },
                },
            },
            seatLock: {
                select: {
                    seat: {
                        select: {
                            seatNumber: true,
                            seatName: true,
                        },
                    },
                },
            },
        },
    });

    if (!booking) {
        throw new ApiError(404, "Booking Not Found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, booking, "Fetched Booking Successfully"));
});

const cancelBooking = asyncHandler(async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    if (!bookingId) {
        throw new ApiError(400, "Booking ID Required");
    }

    const isBookingExist = await prisma.booking.findUnique({
        where: { id: bookingId },
    });
    if (!isBookingExist) {
        throw new ApiError(404, "Booking Not Found");
    }

    const isValidUser = req.user?.id === isBookingExist.userId;
    if (!isValidUser) {
        throw new ApiError(401, "Not Authorized User");
    }

    const cancelledBooking = await prisma.$transaction(async (txn) => {
        const booking =
            await txn.$queryRaw`SELECT * FROM "Booking" WHERE id=${bookingId} for Update`;

        if (!booking) {
            throw new ApiError(404, "Booking Not Found");
        }

        if (booking[0].status === "CANCELLED") {
            return booking;
        }

        const UpdateBooking = await txn.booking.update({
            where: {
                id: bookingId,
            },
            data: {
                status: "CANCELLED",
            },
        });
        await txn.seatLock.deleteMany({
            where: { bookingId },
        });
        await txn.payment.updateMany({
            where: { bookingId },
            data: {
                status: "REFUND_PENDING",
            },
        });

        return UpdateBooking;
    });

    if (!cancelledBooking) {
        throw new ApiError(
            500,
            "Something went wrong while Cancelling YOur booking"
        );
    }

    await myWaitingListQueue.add("waitingListQueue", {
        type: "CANCELLATION",
        data: {
            scheduleid: isBookingExist.scheduleId,
            coachType: isBookingExist.coachType,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                cancelledBooking,
                "Booking Cancelled Successfully!!!"
            )
        );
});

const getBookingByPNR = asyncHandler(async (req, res) => {
    const pnr = req.body.pnr;
    if (!pnr) {
        throw new ApiError(400, "PNR is Required to find Booking");
    }

    if (!isValidPnr(pnr)) {
        throw new ApiError(400, "PNR Must be 10 Digits");
    }

    const booking = await prisma.booking.findFirst({
        where: { pnr },
    });

    if (!booking) {
        throw new ApiError(400, "Invalid PNR , Check PNR");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, booking, "Fetched Booking Successfully"));
});

const cancelPartialBooking = asyncHandler(async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);

    let { passengerIds } = req.body;

    if (!bookingId || !passengerIds) {
        throw new ApiError(400, "Booking ID OR PassengerIds are Required");
    }

    passengerIds = passengerIds.filter(Boolean);

    const isBookingExist = await prisma.booking.findUnique({
        where: { id: bookingId },
    });
    if (!isBookingExist) {
        throw new ApiError(404, "Booking Not Found");
    }

    const isValidUser = req.user?.id === isBookingExist.userId;
    if (!isValidUser) {
        throw new ApiError(401, "Not Authorized User");
    }

    if (isBookingExist.status === "CANCELLED") {
        throw new ApiError(400, "Booking Already Cancelled");
    }

    const cancelBookingPatially = await prisma.$transaction(async (txn) => {
        const isValidPassengersIds = await txn.passengerInfo.findMany({
            where: { bookingId: isBookingExist.id, id: { in: passengerIds } },
        });

        if (isValidPassengersIds.length !== passengerIds.length) {
            throw new ApiError(400, "Invalid Passengers Ids");
        }

        const isAlreadyCancelled = await txn.passengerInfo.findMany({
            where: {
                bookingId: isBookingExist.id,
                passengerStatus: "CANCELLED",
                id: { in: passengerIds },
            },
        });

        if (isAlreadyCancelled.length > 0) {
            throw new ApiError(400, "Some passengers already cancelled");
        }

        // const seatLockIds = isValidPassengersIds.map((p) => p.seatLockId);

        const updatedSeatLock = await txn.seatLock.deleteMany({
            where: {
                bookingId: isBookingExist.id,
                status: { in: ["BOOKED", "HELD"] },
                passengerInfo: {
                    id: { in: passengerIds },
                },
            },
        });

        await txn.passengerInfo.updateMany({
            where: {
                bookingId: isBookingExist.id,
                id: { in: passengerIds },
            },
            data: {
                passengerStatus: "CANCELLED",
            },
        });

        const remainingPassengers = await txn.passengerInfo.count({
            where: {
                bookingId: isBookingExist.id,
                passengerStatus: { not: "CANCELLED" },
            },
        });

        const updatedBooking = await txn.booking.update({
            where: { id: isBookingExist.id },
            data: {
                status:
                    remainingPassengers > 0 ? "PARTIAL_CONFIRMED" : "CANCELLED",
            },
        });

        return updatedBooking;
    });

    await myWaitingListQueue.add("waitingListQueue", {
        type: "CANCELLATION",
        data: {
            scheduleid: isBookingExist.scheduleId,
            coachType: isBookingExist.coachType,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                cancelBookingPatially,
                "Booking Cancelled Patially"
            )
        );
});

export {
    bookSeat,
    getBooking,
    cancelBooking,
    getBookingByPNR,
    cancelPartialBooking,
};
