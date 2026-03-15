import type { Request, Response } from "express";
import * as UserModel from "../models/userModel.js";
import { deleteFile, uploadFromBuffer } from "../utils/cloudinaryUtils.js";

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const username = req.user?.username;
  const id = req.user?.id;

  if (!username || !id) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await UserModel.getProfileByUsername(username, id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "Profile fetched successfully", user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const imageFile = req.file;
  const { name, bio } = req.body;
  let profile_picture_url: string | undefined;
  let image_cloudinary_id: string | undefined;

  try {
    if (imageFile) {
      const uploadResult = await uploadFromBuffer(imageFile.buffer, "profile_pictures");
      profile_picture_url = uploadResult.secure_url;
      image_cloudinary_id = uploadResult.public_id;
    }

    const currentUser = await UserModel.getUserById(userId);

    const success = await UserModel.updateUser(userId, {
      name,
      bio,
      profile_picture_url,
      image_cloudinary_id,
    });

    if (!success) {
      res.status(404).json({ message: "User not found or no changes made" });
      return;
    }

    if (currentUser?.profile_picture_url && currentUser.image_cloudinary_id && imageFile) {
      await deleteFile(currentUser.image_cloudinary_id);
    }

    res.status(200).json({
      message: "Profile updated successfully",
      updatedData: {
        name,
        bio,
        profile_picture_url,
      },
    });
  } catch (error) {
    if (image_cloudinary_id) {
      try {
        await deleteFile(image_cloudinary_id);
      } catch (deleteError) {
        console.error("Error deleting new profile picture:", deleteError);
      }
    }

    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};
