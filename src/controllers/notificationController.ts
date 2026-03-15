import type { Request, Response } from "express";
import * as NotificationModel from "../models/notificationModel.js";
import { handlePaginatedRequest } from "../utils/handlePaginatedRequest.js";

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const modelCall = (limit: number, cursor?: number) =>
    NotificationModel.getNotificationsByUserId(limit, cursor, userId);

  await handlePaginatedRequest(req, res, "notifications", modelCall);
};
