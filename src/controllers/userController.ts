import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import * as UserModel from "../models/userModel.js";
import * as NotificationModel from "../models/notificationModel.js";

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const username = String(req.params.username);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await UserModel.getProfileByUsername(username, userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "Profile fetched successfully", user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const followUser = async (req: Request, res: Response): Promise<void> => {
  const followedUserId = Number(req.params.userId);
  const followerUserId = req.user?.id;

  if (!followerUserId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (followedUserId === followerUserId) {
    res.status(400).json({ message: "You cannot follow yourself." });
    return;
  }

  try {
    await UserModel.addFollow(followedUserId, followerUserId);
    await NotificationModel.createNotification({
      type: "follow",
      sender_user_id: followerUserId,
      recipient_user_id: followedUserId,
    });

    res.status(200).json({ message: "Successfully followed the user" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(200).json({ message: "The user is already followed." });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      res.status(404).json({ message: "User not found." });
      return;
    }

    console.error("Error following user:", error);
    res.status(500).json({ message: "Error following user" });
  }
};

export const unfollowUser = async (req: Request, res: Response): Promise<void> => {
  const unfollowedUserId = Number(req.params.userId);
  const followerUserId = req.user?.id;

  if (!followerUserId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await UserModel.removeFollow(unfollowedUserId, followerUserId);

    if (!result) {
      res.status(200).json({ message: "The user is not followed." });
      return;
    }

    res.status(200).json({ message: "Successfully unfollowed the user" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ message: "Error unfollowing user" });
  }
};
