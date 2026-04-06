import { Router } from "express";
import { loginUser, registerUser } from "../controllers/auth.controller.js";

const router = Router();

router.route("/register-user").post(registerUser);
router.route("/login").post(loginUser);

export default router;
