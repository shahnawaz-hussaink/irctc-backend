import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import getTenMinTime from "../utils/getTenMinutesTime.js";

const bookSeat = asyncHandler(async (req, res) => {
    const coachType = req.params.coachType;
    const scheduleId = parseInt(req.params.scheduleId);
    const { passengerName, passengerAge, passengerGender } = req.body;

    if (!coachType || !scheduleId) {
        throw new ApiError(400, "Wrong Route , Check Route detials");
    }

    if (!passengerName || !passengerAge || !passengerGender) {
        throw new ApiError(400, "All fields are Requied");
    }

    const isScheduleExist = await prisma.schedule.findFirst({
        where: { id: scheduleId },
    });

    if (!isScheduleExist) {
        throw new ApiError(404, "No Schedule Found");
    }

    const booking = await prisma.$transaction(async (txn) => {
        const seat = await txn.seat.findFirst({
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
        });

        console.log(seat);

        if (!seat) {
            throw new ApiError(400, "Seat not available");
        }

        await txn.$queryRaw`SELECT * FROM "Seat" WHERE id=${seat.id} FOR UPDATE`;

        const isAlreadyBooked = await txn.booking.findFirst({
            where: {
                seatId: seat.id,
                scheduleId,
                status: { not: "CANCELLED" },
            },
        });

        if (isAlreadyBooked) {
            throw new ApiError(400, "Seat just Booked BY another USER");
        }

        const newBooking = await txn.booking.create({
            data: {
                userId: req.user?.id,
                seatId: seat.id,
                scheduleId,
                status: "HELD",
            },
        });

        await txn.passengerInfo.create({
            data: {
                passengerName,
                passengerGender,
                passengerAge,
                bookingId: newBooking.id,
            },
        });

        await txn.seatLock.create({
            data: {
                userId: req.user?.id,
                seatId: seat.id,
                scheduleId,
                status: "HELD",
                heldUntil: getTenMinTime(),
                bookingId: newBooking.id,
            },
        });

        if (!newBooking) {
            throw new ApiError(
                500,
                "Something went wrong while Booking your Seat"
            );
        }

        return newBooking;
    });
    return res.status(200).json(new ApiResponse(200, booking, "Seat Booked"));
});

const getBooking = asyncHandler(async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);

    if (!bookingId) {
        throw new ApiError(400, "Booking Id not provided");
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
            seat: {
                select: {
                    seatNumber: true,
                    seatName: true,
                    coach: {
                        select: {
                            coachNumber: true,
                            coachType: true,
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

export { bookSeat, getBooking, cancelBooking };
