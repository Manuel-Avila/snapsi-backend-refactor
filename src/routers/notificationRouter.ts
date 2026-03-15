import { Router } from "express";
import verifyToken from "../middlewares/verifyToken.js";
import * as NotificationController from "../controllers/notificationController.js";
import validate from "../middlewares/validateReq.js";
import { getNotificationsSchema } from "../validators/notificationValidator.js";

const router = Router();

router.get("/", validate(getNotificationsSchema, "query"), verifyToken, NotificationController.getMyNotifications);

export default router;
