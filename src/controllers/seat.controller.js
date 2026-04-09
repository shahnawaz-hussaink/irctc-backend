import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getAvailableSeats = asyncHandler(async (req, res) => {
    const coachType = req.query.coachType;
    const scheduleId = parseInt(req.params.scheduleId);

    console.log(coachType, scheduleId);

    if (!scheduleId || !coachType) {
        throw new ApiError(400, "All Fields Are Required");
    }

    const schedule = await prisma.schedule.findUnique({
        where: {
            id: scheduleId,
        },
    });
    if (!schedule) {
        throw new ApiError(404, "NO Schedule Found");
    }

    const allSeats = await prisma.seat.findMany({
        where: {
            coach: {
                trainId: schedule.trainId,
                coachType: coachType,
            },
        },
        include: { coach: true },
    });

    if (allSeats == null) {
        throw new ApiError(404, "NO Seasts");
    }

    const bookedBookings = await prisma.booking.findMany({
        where: {
            scheduleId,
            status: { not: "Cancelled" },
            seat: {
                coach: {
                    coachType,
                    trainId: schedule.trainId,
                },
            },
        },
        select: { seatId: true },
    });

    const bookedSeatIds = bookedBookings.map((b) => b.seatId);
    const availableSeats = allSeats.filter(
        (seat) => !bookedSeatIds.includes(seat.id)
    );

    return res
        .status(200)
        .json(new ApiResponse(200, availableSeats.length, "Got all SEats"));
});

export { getAvailableSeats };
