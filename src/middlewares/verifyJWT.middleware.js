import prisma from "../db/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const verifyJWT = asyncHandler(async (req, res, next) => {
    const { userId } =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("bearer");

    if (!userId) {
        throw new ApiError(401, "Access Denied");
    }

    const user = await prisma.user.findFirst({ where: { id: userId } });

    if (!user) {
        throw new ApiError(400, "Access Token Expired");
    }

    req.user = user;

    next();
});
