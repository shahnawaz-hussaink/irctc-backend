import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../utils/jwtGenerator.js";

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

const loginUser = asyncHandler(async (req, res) => {
    const { email, mobileNumber, password } = req.body;

    if (!email || !mobileNumber || !password) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await prisma.user.findFirst({
        where: { OR: [{ email: email }, { mobileNumber: mobileNumber }] },
    });

    if (!user) {
        throw new ApiError(400, "No User found , Create new account");
    }

    const isPassCorrect = await bcrypt.compare(password, user.password);
    if (!isPassCorrect) {
        throw new ApiError(400, "Wrong Password");
    }

    const accessToken = generateAccessToken(user.id);
    if (!accessToken) {
        throw new ApiError(
            500,
            "Something went wrong while generating Access Token"
        );
    }
    const refreshToken = generateRefreshToken(user.id);
    if (!refreshToken) {
        throw new ApiError(
            500,
            "Something went wrong while generating Refresh Token"
        );
    }

    const UpdatedUser = await prisma.user.update({
        where: { email: email },
        data: { refreshToken: refreshToken },
        select: { username:true , email:true, mobileNumber:true},
    });

    if (!UpdatedUser) {
        throw new ApiError(
            500,
            "Something went wrong while saving the Access Token to DB"
        );
    }

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, UpdatedUser, "Login Successfull"));
});

const logoutUser = asyncHandler(async (req, res) => {
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Logout Successfull"));
});

export { registerUser, loginUser, logoutUser };
