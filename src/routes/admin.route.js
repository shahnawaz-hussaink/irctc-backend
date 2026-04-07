import { Router } from "express";
import { createStation } from "../controllers/station.controller.js";
import { createPlatform } from "../controllers/platform.controller.js";
import { createTrain } from "../controllers/train.controller.js";
import { createCoach } from "../controllers/coach.controller.js";

const router = Router();

router.route("/station").post(createStation);
router.route("/stations/:stationId/platforms").post(createPlatform);
router.route("/train").post(createTrain);
router.route("/trains/:trainNumber/coaches").post(createCoach);
export default router;
