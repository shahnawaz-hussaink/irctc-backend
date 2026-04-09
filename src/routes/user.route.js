import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.middleware.js";
import { searchTrain } from "../controllers/train.controller.js";

const router = Router();

router.route("/register-user").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/search-train").get(searchTrain);

export default router;
