import Joi from "joi";

export const usernameParamSchema = Joi.object({
  username: Joi.string().min(5).max(50).required(),
});

export const userIdParamSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
});
