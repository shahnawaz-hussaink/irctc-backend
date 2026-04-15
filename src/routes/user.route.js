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
    getBooking,
    getBookingByPNR,
} from "../controllers/booking.controller.js";
import {
    createPayment,
    updatePayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.route("/register-user").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/search-train").get(searchTrain);
router.route("/get-train-by-id").get(getTrainByIdOrName);
router.route("/available-seats/:scheduleId").get(getAvailableSeats);
router.route("/book-seat/:scheduleId/:coachType").post(verifyJWT, bookSeat);
router.route("/bookings/:bookingId/get-booking").get(verifyJWT, getBooking);
router
    .route("/bookings/:bookingId/cancel-booking")
    .patch(verifyJWT, cancelBooking);
router.route("/bookings/:bookingId/payment").post(verifyJWT, createPayment);
router
    .route("/bookings/:paymentId/update-payment")
    .patch(verifyJWT, updatePayment);
router.route("/bookings/get-booking").get(verifyJWT,getBookingByPNR)
export default router;
