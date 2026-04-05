import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, mobileNumber, password } = req.body;
    if (!username || !email || !mobileNumber || !password) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: email },
                { username: username },
                { mobileNumber: mobileNumber },
            ],
        },
    });

    if (existingUser) {
        throw new ApiError(400, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase().trim(),
            username: username,
            mobileNumber: mobileNumber,
            password: hashedPassword,
        },
    });

    if (!user) {
        throw new ApiError(500, "Server failed to register User");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, user, "User registered successfully"));
});

export { registerUser };
