import Joi from "joi";

export const getNotificationsSchema = Joi.object({
  limit: Joi.number().integer().min(1).optional().default(10),
  cursor: Joi.string().allow("").optional(),
}).unknown(true);
