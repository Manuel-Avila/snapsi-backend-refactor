import { Router } from "express";
import verifyToken from "../middlewares/verifyToken.js";
import validate from "../middlewares/validateReq.js";
import * as PaymentController from "../controllers/paymentController.js";
import {
  cancelSubscriptionSchema,
  createCheckoutSessionSchema,
  getBillingHistorySchema,
} from "../validators/paymentValidator.js";

const router = Router();

router.post(
  "/checkout-session",
  verifyToken,
  validate(createCheckoutSessionSchema),
  PaymentController.createCheckoutSession
);
router.get("/billing-status", verifyToken, PaymentController.getMyBillingStatus);
router.get("/history", validate(getBillingHistorySchema, "query"), verifyToken, PaymentController.getMyBillingHistory);
router.post(
  "/subscription/cancel",
  verifyToken,
  validate(cancelSubscriptionSchema),
  PaymentController.cancelMySubscription
);

export default router;
