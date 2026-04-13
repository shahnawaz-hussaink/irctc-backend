import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const bookSeat = asyncHandler(async (req, res) => {
    const coachType = req.params.coachType;
    const scheduleId = parseInt(req.params.scheduleId);

    console.log(req.user.id);
    console.log(coachType, scheduleId);

    if (!coachType || !scheduleId) {
        throw new ApiError(400, "All fields are Required");
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
                booking: {
                    none: {
                        scheduleId,
                        status: { not: "Cancelled" },
                    },
                },
            },
        });

        if (!seat) {
            throw new ApiError(400, "Seat not available");
        }

        await txn.$queryRaw`SELECT * FROM "Seat" WHERE id=${seat.id} FOR UPDATE`;

        const isAlreadyBooked = await txn.booking.findFirst({
            where: {
                seatId: seat.id,
                scheduleId,
                status: { not: "Cancelled" },
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
                status: "Pending",
            },
        });

        await txn.seatLock.create({
            data: {
                userId: req.user?.id,
                seatId: seat.id,
                scheduleId,
                status: "HELD",
                heldUntil: new Date(Date.now() + 1 * 60 * 1000),
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
                    coachId: true,
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
        throw new ApiError(400, "Booking Id not Provided");
    }

    const isBookingExist = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!isBookingExist) {
        throw new ApiError(404, "Booking Not Found");
    }

    if (isBookingExist.status === "Cancelled") {
        throw new ApiError(400, "Booking Already Cancelled");
    }

    const cancelledBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: "Cancelled",
        },
    });

    if (!cancelledBooking) {
        throw new ApiError(
            500,
            "Something went wrong while Cancelling Booking"
        );
    }

    return res.status(200).json(new ApiResponse(200, {}, "Booking Cancelled"));
});

export { bookSeat, getBooking, cancelBooking };
