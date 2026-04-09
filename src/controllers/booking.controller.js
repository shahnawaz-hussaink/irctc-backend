import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const bookSeat = asyncHandler(async (req, res) => {
    const coachType = req.body.coachType;
    const scheduleId = parseInt(req.body.scheduleId);

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
                status: "Booked",
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

export { bookSeat };
