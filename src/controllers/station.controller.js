import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createStation = asyncHandler(async (req, res) => {
    const { stationName, stationCode } = req.body;

    if (!stationName || !stationCode) {
        throw new ApiError(400, "All fields are rerquired");
    }

    const isStationExist = await prisma.station.findFirst({
        where: {
            OR: [{ stationName }, { stationCode }],
        },
    });

    if (isStationExist) {
        throw new ApiError(400, "Station Name or Code Exist, Change it");
    }

    const station = await prisma.station.create({
        data: {
            stationName: stationName.toUpperCase().trim(),
            stationCode: stationCode.toUpperCase().trim(),
        },
    });

    if (!station) {
        throw new ApiError(
            500,
            "Something went wrong while creating the Station details"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                station,
                "Congratulations!!! New Station Created"
            )
        );
});

export { createStation };
