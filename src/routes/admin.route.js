import { Router } from "express";
import { createStation } from "../controllers/station.controller.js";
import { createPlatform } from "../controllers/platform.controller.js";

const router = Router();

router.route("/station").post(createStation);
router.route("/stations/:stationId/platforms").post(createPlatform);

export default router;
