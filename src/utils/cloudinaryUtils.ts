import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export const uploadFromBuffer = (
  buffer: Buffer,
  folder: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      if (!result?.secure_url || !result.public_id) {
        reject(new Error("Cloudinary upload result is invalid."));
        return;
      }

      resolve({ secure_url: result.secure_url, public_id: result.public_id });
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export const deleteFile = async (id: string) => {
  return cloudinary.uploader.destroy(id);
};
