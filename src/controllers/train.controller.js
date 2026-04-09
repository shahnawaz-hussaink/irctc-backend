import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTrain = asyncHandler(async (req, res) => {
    const { trainName, trainNumber, sourceStation, destinationStation } =
        req.body;
    if (!trainName || !trainNumber || !sourceStation || !destinationStation) {
        throw new ApiError(400, "All fields are Required");
    }

    const isTrainExist = await prisma.train.findFirst({
        where: { OR: [{ trainName }, { trainNumber }] },
    });

    if (isTrainExist) {
        throw new ApiError(400, "Train Exists , try creating different Train");
    }

    const source = await prisma.station.findFirst({
        where: { stationName: sourceStation.toUpperCase().trim() },
    });
    const destination = await prisma.station.findFirst({
        where: { stationName: destinationStation.toUpperCase().trim() },
    });

    if (!source || !destination) {
        throw new ApiError(400, "Invalid Stations Name");
    }
    const train = await prisma.train.create({
        data: {
            trainName,
            trainNumber,
            sourceStation: sourceStation.toUpperCase().trim(),
            destinationStation: destinationStation.toUpperCase().trim(),
        },
    });

    if (!train) {
        throw new ApiError(
            500,
            "Somethign went wrong while Creating Train Details"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                train,
                "Congratulations!!! New Train Created Successfully"
            )
        );
});

const searchTrain = asyncHandler(async (req, res) => {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
        throw new ApiError(400, "All fields aare Required");
    }

    if (from === to) {
        throw new ApiError(400, "From and To MUST be different");
    }

    const schedules = await prisma.schedule.findFirst({
        where: {
            date: new Date(date),
            train: {
                sourceStation: from.toUpperCase().trim(),
                destinationStation: to.toUpperCase().trim(),
            },
        },
        include: {
            train: true,
            platform: true,
        },
    });

    if (!schedules) {
        throw new ApiError(400, "No train");
    }

    return res.status(200).json(new ApiResponse(200, schedules, "sucess"));
});

const getTrainById = asyncHandler(async (req, res) => {
    const trainId = parseInt(req.body.trainId);

    if (!trainId) {
        throw new ApiError(400, "All fields are Required");
    }

    const train = await prisma.schedule.findFirst({
        where: { trainId },
    });

    if (!train) {
        throw new ApiError(404, "No Train Found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, train, "Fetched Train Successfully"));
});

export { createTrain, searchTrain, getTrainById };
