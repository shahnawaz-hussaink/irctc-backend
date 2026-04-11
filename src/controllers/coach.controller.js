import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateSeats } from "../utils/generateSeats.js";

const createCoach = asyncHandler(async (req, res) => {
    const { coachNumber, coachType, price } = req.body;
    const trainNumber = parseInt(req.params.trainNumber);

    if (!coachNumber || !coachType || !trainNumber || !price) {
        throw new ApiError(400, "All fields are Required");
    }

    const isTrainExist = await prisma.train.findFirst({
        where: { trainNumber },
    });

    if (!isTrainExist) {
        throw new ApiError(400, "Train Not Exist");
    }

    const isCoachExists = await prisma.coach.findFirst({
        where: {
            AND: [
                { coachNumber: coachNumber.toUpperCase().trim() },
                { coachType: coachType.toUpperCase().trim() },
                { trainId: trainNumber.id },
            ],
        },
    });

    if (isCoachExists) {
        throw new ApiError(400, "Coach Number or Type Exist in Train");
    }

    const [coach] = await prisma.$transaction(async (tx) => {
        const coach = await tx.coach.create({
            data: {
                coachNumber,
                coachType: coachType.toUpperCase().trim(),
                trainId: isTrainExist.id,
                price 
            },
        });

        await generateSeats(coach.coachNumber, coach.coachType, coach.id, tx);

        return [coach];
    });

    if (!coach) {
        throw new ApiError(500, "Something went wrong while Creating Coach");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                coach,
                "Congratulations!!! New Coach Created Successfully"
            )
        );
});

export { createCoach };
