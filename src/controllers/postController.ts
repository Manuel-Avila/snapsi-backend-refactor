import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { deleteFile, uploadFromBuffer } from "../utils/cloudinaryUtils.js";
import * as PostModel from "../models/postModel.js";
import * as CommentModel from "../models/commentModel.js";
import * as NotificationModel from "../models/notificationModel.js";
import { handlePaginatedRequest } from "../utils/handlePaginatedRequest.js";

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const modelCall = (limit: number, cursor?: number) => PostModel.getPosts(limit, cursor, userId);
  await handlePaginatedRequest(req, res, "posts", modelCall);
};

export const getUserPosts = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const username = String(req.params.username);

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const modelCall = (limit: number, cursor?: number) =>
    PostModel.getPostsByUsername(limit, cursor, userId, username);

  await handlePaginatedRequest(req, res, "posts", modelCall);
};

export const getBookmarkedPosts = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const modelCall = (limit: number, cursor?: number) =>
    PostModel.getBookmarkedPosts(limit, cursor, userId);

  await handlePaginatedRequest(req, res, "posts", modelCall);
};

export const getPostById = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const post = await PostModel.getPostById(postId, userId);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json({ post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Error fetching post" });
  }
};

export const createPost = async (req: Request, res: Response): Promise<void> => {
  const { caption } = req.body;
  const imageFile = req.file;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!imageFile) {
    res.status(400).json({ message: "No image file provided." });
    return;
  }

  let publicId: string | undefined;

  try {
    const uploadResult = await uploadFromBuffer(imageFile.buffer, "posts");
    const imageUrl = uploadResult.secure_url;
    publicId = uploadResult.public_id;

    const newPostId = await PostModel.createPost({
      user_id: userId,
      caption,
      image_url: imageUrl,
      image_cloudinary_id: publicId,
    });

    const newPost = await PostModel.getPostById(newPostId, userId);
    if (!newPost) {
      throw new Error("Failed to retrieve the newly created post.");
    }

    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    if (publicId) {
      try {
        await deleteFile(publicId);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
      }
    }

    console.error("Error creating post:", error);
    res.status(500).json({ message: "Error creating post" });
  }
};

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const post = await PostModel.getPostById(postId, userId);
    if (!post) {
      res.status(404).json({ message: "Post not found." });
      return;
    }

    if (post.user.id !== userId) {
      res.status(403).json({ message: "Unauthorized to delete this post." });
      return;
    }

    if (post.image_cloudinary_id) {
      await deleteFile(post.image_cloudinary_id);
    }
    await PostModel.deletePost(postId, userId);

    res.status(200).json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Error deleting post." });
  }
};

export const likePost = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const post = await PostModel.getPostById(postId, userId);
    if (!post) {
      res.status(404).json({ message: "Post not found." });
      return;
    }

    const recipient_user_id = post.user.id;
    await PostModel.addLike(postId, userId);

    if (recipient_user_id !== userId) {
      await NotificationModel.createNotification({
        type: "like",
        sender_user_id: userId,
        recipient_user_id,
        post_id: postId,
      });
    }

    res.status(201).json({ message: "Post liked successfully" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(200).json({ message: "The post is already liked." });
      return;
    }

    console.error("Error liking post:", error);
    res.status(500).json({ message: "Error liking post" });
  }
};

export const unlikePost = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await PostModel.removeLike(postId, userId);

    if (!result) {
      res.status(200).json({ message: "Post was not liked" });
      return;
    }

    res.status(200).json({ message: "Post unliked successfully" });
  } catch (error) {
    console.error("Error unliking post:", error);
    res.status(500).json({ message: "Error unliking post" });
  }
};

export const bookmarkPost = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    await PostModel.addBookmark(postId, userId);
    res.status(201).json({ message: "Post bookmarked successfully" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(200).json({ message: "The post is already bookmarked." });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      res.status(404).json({ message: "Post not found." });
      return;
    }

    console.error("Error bookmarking post:", error);
    res.status(500).json({ message: "Error bookmarking post" });
  }
};

export const unbookmarkPost = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await PostModel.removeBookmark(postId, userId);

    if (!result) {
      res.status(200).json({ message: "Post was not bookmarked" });
      return;
    }

    res.status(200).json({ message: "Post unbookmarked successfully" });
  } catch (error) {
    console.error("Error unbookmarking post:", error);
    res.status(500).json({ message: "Error unbookmarking post" });
  }
};

export const getComments = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);

  const modelCall = (limit: number, cursor?: number) =>
    CommentModel.getCommentsByPostId(limit, cursor, postId);

  await handlePaginatedRequest(req, res, "comments", modelCall);
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
  const postId = Number(req.params.postId);
  const { comment_text } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const post = await PostModel.getPostById(postId, userId);
    if (!post) {
      res.status(404).json({ message: "Post not found." });
      return;
    }

    const recipient_user_id = post.user.id;

    const newCommentId = await CommentModel.createComment({
      user_id: userId,
      post_id: postId,
      comment_text,
    });

    const newComment = await CommentModel.getCommentById(newCommentId);
    if (!newComment) {
      throw new Error("Failed to retrieve the newly created comment.");
    }

    if (recipient_user_id !== userId) {
      await NotificationModel.createNotification({
        type: "comment",
        sender_user_id: userId,
        recipient_user_id,
        post_id: postId,
      });
    }

    res.status(201).json({ message: "Comment added successfully", comment: newComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Error adding comment" });
  }
};
