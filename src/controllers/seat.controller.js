import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getAvailableSeats = asyncHandler(async (req, res) => {
    const coachType = req.query.coachType;
    const scheduleId = parseInt(req.params.scheduleId);

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

    const availableSeats = await prisma.seat.findMany({
        where: {
            coach: {
                trainId: schedule.trainId,
                coachType: coachType,
            },
            booking: {
                none: {
                    scheduleId: scheduleId,
                    status: {
                        not: "Cancelled",
                    },
                },
            },
        },
        include: {
            coach: true,
        },
    });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { availableSeat: availableSeats.length, seats: availableSeats },
                "Got all  avaliable Seats"
            )
        );
});

export { getAvailableSeats };
