import prisma from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPayment = asyncHandler(async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    if (!bookingId) {
        throw new ApiError(400, "Booking Id is not provied");
    }

    const isBookingExist = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            seat: {
                include: { coach: true },
            },
        },
    });
    if (!isBookingExist) {
        throw new ApiError(404, "Booking Not Found");
    }

    if (isBookingExist.userId !== req.user.id) {
        throw new ApiError(401, "Not Authorized");
    }

    const isPaymentExist = await prisma.payment.findUnique({
        where: {
            bookingId,
        },
    });

    if (isPaymentExist) {
        throw new ApiError(400, "Payment Exist");
    }

    const payment = await prisma.payment.create({
        data: {
            bookingId,
            status: "Pending",
            amount: isBookingExist.seat.coach.price,
        },
    });

    if (!payment) {
        throw new ApiError(500, "Something went Wrong while Making Payment");
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                paymentId : payment.id,
                bookingId: payment.bookingId,
                Status: payment.status,
            },
            "Payement Created Successfully"
        )
    );
});

// payment update -> first manaul and then will integrate razorpay api

const updatePayment = asyncHandler(async (req, res) => {
    const paymentId = parseInt(req.params.paymentId);
    const status = req.body.status;

    if (!paymentId || !status) {
        throw new ApiError(400, "Payment Or Status is not provided");
    }

    const isPaymentExist = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
            booking: true,
        },
    });
    if (!isPaymentExist) {
        throw new ApiError(404, "No Payment Found with this paymentId");
    }

    const isBookingExist = await prisma.booking.findFirst({
        where: { id: isPaymentExist.booking.id },
    });

    if (!isBookingExist) {
        throw new ApiError(404, "Booking does not Exists");
    }

    if (isBookingExist.status === "Cancelled") {
        throw new ApiError(
            400,
            "Booking is Already Cancelled, cannot Access Payment"
        );
    }

    if (isPaymentExist.booking.userId !== req.user.id) {
        throw new ApiError(401, "Not Authorized User");
    }

    const updatedPayment = await prisma.$transaction(async (txn) => {
        const payment = await txn.payment.update({
            where: { id: paymentId },
            data: { status },
        });

        await txn.booking.update({
            where: { id: isBookingExist.id },
            data: { status: status === "Success" ? "Confirmed" : "Failed" },
        });

        return payment;
    });

    if (!updatedPayment) {
        throw new ApiError(
            500,
            "Something Went wrong while Updating the Payment"
        );
    }
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPayment, "Updated Payment Successfully"));
});

export { createPayment, updatePayment };
