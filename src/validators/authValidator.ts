import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string().min(5).max(50).regex(/^[a-zA-Z0-9.-]*$/).required(),
  name: Joi.string().min(3).max(255).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  gender: Joi.string().valid("male", "female", "other").required(),
  age: Joi.number().integer().min(0).max(125).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).required(),
});
