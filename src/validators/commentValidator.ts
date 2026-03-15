import Joi from "joi";

export const createCommentSchema = Joi.object({
  comment_text: Joi.string().trim().min(1).max(300).required(),
});

export const getCommentsSchema = Joi.object({
  limit: Joi.number().integer().min(1).optional().default(10),
  cursor: Joi.string().allow("").optional(),
}).unknown(true);
