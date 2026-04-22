import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import seatCleanup from "../utils/seatCleanupCron.js";

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

    console.log("I ran 1");
    await seatCleanup();
    console.log("I ran 2");

    const totalSeatInCoach = await prisma.seat.findMany({
        where: {
            coach: {
                trainId: schedule.trainId,
                coachType: coachType,
            },
        },
    });

    if (!totalSeatInCoach) {
        throw new ApiError(
            500,
            "Soethign went wrong while Fetching Total Seats count"
        );
    }

    const lockedSeats = await prisma.seatLock.findMany({
        where: {
            scheduleId,
            status: { not: "CANCELLED" },
            seat: {
                coach: {
                    coachType,
                },
            },
        },
    });

    if (!lockedSeats) {
        throw new ApiError(
            500,
            "Soethign went wrong while Fetching Locked Seats count"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { availableSeat: totalSeatInCoach.length - lockedSeats.length },
                "Got all  avaliable Seats"
            )
        );
});

export { getAvailableSeats };
