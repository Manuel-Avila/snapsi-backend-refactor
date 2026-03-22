import Joi from "joi";

export const createCheckoutSessionSchema = Joi.object({
  payment_type: Joi.string().valid("one_time", "subscription").required(),
  success_url: Joi.string().uri().required(),
  cancel_url: Joi.string().uri().required(),
});

export const cancelSubscriptionSchema = Joi.object({
  stripe_subscription_id: Joi.string().trim().required(),
});

export const getBillingHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).optional().default(10),
  cursor: Joi.string().allow("").optional(),
}).unknown(true);
