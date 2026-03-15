import type { NextFunction, Request, Response } from "express";
import type { AnySchema } from "joi";

type ValidationSource = "body" | "query" | "params";

export const validate = (schema: AnySchema, source: ValidationSource = "body") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[source];

    if (
      source === "body" &&
      (!dataToValidate || Object.keys(dataToValidate).length === 0)
    ) {
      res.status(400).json({ message: "The request is empty." });
      return;
    }

    const { error, value } = schema.validate(dataToValidate);

    if (error) {
      res.status(400).json({ message: error.details[0]?.message || "Invalid request" });
      return;
    }

    Object.assign(req[source], value);
    next();
  };
};

export default validate;
