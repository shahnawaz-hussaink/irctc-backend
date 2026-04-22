import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getTrainByIdOrName,
    searchTrain,
} from "../controllers/train.controller.js";
import { getAvailableSeats } from "../controllers/seat.controller.js";
import {
    bookSeat,
    cancelBooking,
    cancelPartialBooking,
    getBooking,
    getBookingByPNR,
} from "../controllers/booking.controller.js";
import {
    createPayment,
    updatePayment,
} from "../controllers/payment.controller.js";
import {
    authRateLimiter,
    bookingRateLimiter,
    searchRateLimiter,
} from "../middlewares/rateLimiter.js";

const router = Router();

router.route("/register-user").post(authRateLimiter, registerUser);
router.route("/login").post(authRateLimiter, loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/search-train").get(searchRateLimiter, searchTrain);
router.route("/get-train-by-id").get(searchRateLimiter, getTrainByIdOrName);
router
    .route("/available-seats/:scheduleId")
    .get(searchRateLimiter, getAvailableSeats);
router
    .route("/book-seat/:scheduleId/:coachType")
    .post(verifyJWT, bookingRateLimiter, bookSeat);
router.route("/bookings/:bookingId/get-booking").get(verifyJWT, getBooking);
router
    .route("/bookings/:bookingId/cancel-booking")
    .patch(verifyJWT, bookingRateLimiter, cancelBooking);
router.route("/bookings/:bookingId/payment").post(verifyJWT, createPayment);
router
    .route("/bookings/:paymentId/update-payment")
    .patch(verifyJWT, updatePayment);
router
    .route("/bookings/get-booking")
    .get(verifyJWT, searchRateLimiter, getBookingByPNR);
router
    .route("/bookings/:bookingId/partial-cancel")
    .patch(verifyJWT, cancelPartialBooking);
export default router;
