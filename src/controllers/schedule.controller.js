import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchedule = asyncHandler(async (req, res) => {
    const { arrivalTime, departureTime, date } = req.body;
    const trainId = parseInt(req.body.trainId);
    const sourcePlatformId = parseInt(req.body.sourcePlatformId);
    const destinationPlatformId = parseInt(req.body.destinationPlatformId);

    if (!trainId || !sourcePlatformId || !destinationPlatformId || !arrivalTime || !departureTime || !date) {
        throw new ApiError(400, "All fields are Required");
    }

    const isArrivalDepartureTimeCorrect =
        new Date(arrivalTime) <= new Date(departureTime);

    if (!isArrivalDepartureTimeCorrect) {
        throw new ApiError(400, "Departure Time must be after Arrival Time");
    }

    const isTrainExist = await prisma.train.findFirst({
        where: { id: trainId },
    });
    if (!isTrainExist) {
        throw new ApiError(404, "No Train exist with given Train ID");
    }

    const issourcePlatformExist = await prisma.platform.findFirst({
        where: { id: sourcePlatformId },
    });
    if (!issourcePlatformExist) {
        throw new ApiError(404, "Source Station Platfrom Doesn't Exist");
    }

    const isDestinationPlatfromExist = await prisma.platform.findFirst({
        where: { id: destinationPlatformId },
    });
    if (!isDestinationPlatfromExist) {
        throw new ApiError(404, "Destination Station Platfrom Doesn't Exist");
    }

    const isScheduleExist = await prisma.schedule.findFirst({
        where: { AND: [{ trainId }, { date: new Date(date) }] },
    });

    if (isScheduleExist) {
        throw new ApiError(
            400,
            "Schedule already exists for this train on this date"
        );
    }

    const schedule = await prisma.schedule.create({
        data: {
            trainId,
            arrivalTime: new Date(arrivalTime),
            departureTime: new Date(departureTime),
            date: new Date(date),
            sourcePlatformId ,
            destinationPlatformId
        },
    });
    if (!schedule) {
        throw new ApiError(
            500,
            "Something went wrong while creating new Train Schedule"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                schedule,
                "Congratulations!!! Train's Schedule Created Successfully"
            )
        );
});

export { createSchedule };
