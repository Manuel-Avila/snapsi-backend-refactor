import Joi from "joi";

export const createPostSchema = Joi.object({
  caption: Joi.string().max(500).allow("").optional(),
});

export const getPostsSchema = Joi.object({
  limit: Joi.number().integer().min(1).optional().default(10),
  cursor: Joi.string().allow("").optional(),
}).unknown(true);

export const postIdParamSchema = Joi.object({
  postId: Joi.number().integer().positive().required(),
});
