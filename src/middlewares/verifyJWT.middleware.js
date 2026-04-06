import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, _, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("bearer");

    if (!token) {
        throw new ApiError(401, "No Access Token");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedToken) {
        throw new ApiError(401, "Access Denied, Invalid or No Access Token");
    }

    const user = await prisma.user.findFirst({
        where: { id: decodedToken.id },
    });
    if (!user) {
        throw new ApiError(
            400,
            "Expired Access Token, Generate New Access Token"
        );
    }
    req.user = user;
    next();
});

export { verifyJWT };
