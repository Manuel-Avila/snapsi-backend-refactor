import Joi from "joi";

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  bio: Joi.string().max(500).optional().allow("", null),
});
