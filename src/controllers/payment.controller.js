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
                bookingId: payment.bookingId,
                Status: payment.status,
            },
            "Payement Created Successfully"
        )
    );
});

// payment update -> first manaul and then will integrate razorpay api 

export { createPayment };
