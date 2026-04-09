import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.middleware.js";
import { searchTrain } from "../controllers/train.controller.js";
import { getAvailableSeats } from "../controllers/seat.controller.js";

const router = Router();

router.route("/register-user").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/search-train").get(searchTrain);
router.route("/available-seats/:scheduleId").get(getAvailableSeats)
export default router;
