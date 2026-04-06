import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

router.route("/register-user").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT,logoutUser)

export default router;
