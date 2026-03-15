import { Router } from "express";
import { register, login, googleLogin } from "../controllers/authController.js";
import validate from "../middlewares/validateReq.js";
import { loginSchema, registerSchema } from "../validators/authValidator.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/google-login", googleLogin);

export default router;
