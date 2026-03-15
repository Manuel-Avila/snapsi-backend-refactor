import { Router } from "express";
import multer from "multer";
import * as ProfileController from "../controllers/profileController.js";
import verifyToken from "../middlewares/verifyToken.js";
import validate from "../middlewares/validateReq.js";
import { updateProfileSchema } from "../validators/profileValidator.js";

const router = Router();
const upload = multer();

router.get("/", verifyToken, ProfileController.getProfile);
router.put(
  "/",
  verifyToken,
  upload.single("image"),
  validate(updateProfileSchema),
  ProfileController.updateProfile
);

export default router;
