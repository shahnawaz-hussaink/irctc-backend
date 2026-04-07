import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlatform = asyncHandler(async (req, res) => {
    const { platformNumber } = req.body;
    const stationId  = parseInt(req.params.stationId) ;


    if (!platformNumber || !stationId) {
        throw new ApiError(400, "All fields are required");
    }


    const isPlatfromExist = await prisma.platform.findFirst({
        where: { AND: [{ platformNumber }, { stationId }] },
    });

    if (isPlatfromExist) {
        throw new ApiError(400, "Platfrom Exists on this Station");
    }

    const platform = await prisma.platform.create({
        data: {
            platformNumber,
            stationId,
        },
        include : {station : true}
    });

    if (!platform) {
        throw new ApiError(400, "Something Went Wrong while Creating Platform");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                platform,
                "Congratulations!!! Platform Created Successfully"
            )
        );
});


export {createPlatform}