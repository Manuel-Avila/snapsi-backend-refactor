import { prisma } from "../config/prisma.js";

interface CommentRow {
  id: number;
  comment_text: string;
  created_at: Date;
  user: {
    id: number;
    name: string;
    username: string;
    profile_picture_url: string | null;
  };
}

const mapComment = async (id: number): Promise<CommentRow> => {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  return {
    id: comment.id,
    comment_text: comment.commentText,
    created_at: comment.createdAt,
    user: {
      id: comment.user.id,
      name: comment.user.name,
      username: comment.user.username,
      profile_picture_url: comment.user.profilePictureUrl,
    },
  };
};

export const getCommentsByPostId = async (
  limit: number,
  cursor: number | undefined,
  postId: number
) => {
  const comments = await prisma.comment.findMany({
    where: {
      postId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { id: true },
  });

  return Promise.all(comments.map((comment) => mapComment(comment.id)));
};

export const getCommentById = async (commentId: number) => {
  const exists = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
  if (!exists) {
    return null;
  }

  return mapComment(commentId);
};

export const createComment = async (comment: {
  user_id: number;
  post_id: number;
  comment_text: string;
}) => {
  const created = await prisma.comment.create({
    data: {
      userId: comment.user_id,
      postId: comment.post_id,
      commentText: comment.comment_text,
    },
    select: { id: true },
  });

  return created.id;
};
