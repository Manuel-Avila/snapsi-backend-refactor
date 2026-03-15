import type { NotificationType } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export const getNotificationsByUserId = async (
  limit: number,
  cursor: number | undefined,
  currentUserId: number
) => {
  const notifications = await prisma.notification.findMany({
    where: {
      recipientUserId: currentUserId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          profilePictureUrl: true,
        },
      },
      post: {
        select: {
          id: true,
          imageUrl: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    created_at: notification.createdAt,
    sender: {
      id: notification.sender.id,
      username: notification.sender.username,
      profile_picture_url: notification.sender.profilePictureUrl,
    },
    post: notification.post
      ? {
          id: notification.post.id,
          image_url: notification.post.imageUrl,
        }
      : null,
  }));
};

export const createNotification = async (notification: {
  type: NotificationType;
  sender_user_id: number;
  recipient_user_id: number;
  post_id?: number;
}) => {
  const created = await prisma.notification.create({
    data: {
      type: notification.type,
      senderUserId: notification.sender_user_id,
      recipientUserId: notification.recipient_user_id,
      postId: notification.post_id,
    },
    select: { id: true },
  });

  return created.id;
};
