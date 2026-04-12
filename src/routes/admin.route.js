import { Router } from "express";
import { createStation } from "../controllers/station.controller.js";
import { createPlatform } from "../controllers/platform.controller.js";
import { createTrain } from "../controllers/train.controller.js";
import { createCoach } from "../controllers/coach.controller.js";
import { createSchedule } from "../controllers/schedule.controller.js";
import { authorizeAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import { loginUser, registerAdmin } from "../controllers/auth.controller.js";

const router = Router();

router.route("/register-admin").post(registerAdmin);
router.route("/login").get(loginUser);

router.use(verifyJWT, authorizeAdmin);

router.route("/station").post(createStation);
router.route("/stations/:stationId/platforms").post(createPlatform);
router.route("/train").post(createTrain);
router.route("/trains/:trainNumber/coaches").post(createCoach);
router.route("/schedule").post(createSchedule);
export default router;
