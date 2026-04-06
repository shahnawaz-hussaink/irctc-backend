import { Router } from "express";
import { createStation } from "../controllers/station.controller.js";

const router = Router();

router.route("/station").post(createStation);

export default router;
