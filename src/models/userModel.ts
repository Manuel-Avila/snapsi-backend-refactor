import { prisma } from "../config/prisma.js";

export interface UserProfileSummary {
  id: number;
  name: string;
  username: string;
  bio: string | null;
  profile_picture_url: string | null;
  gender: string | null;
  age: number | null;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_followed: boolean;
}

export const getUserByUsername = async (username: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      name: true,
      username: true,
      email: true,
      bio: true,
      profilePictureUrl: true,
      gender: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    profile_picture_url: user.profilePictureUrl,
    gender: user.gender,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
};

export const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      username: true,
      email: true,
      bio: true,
      profilePictureUrl: true,
      imageCloudinaryId: true,
      gender: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    profile_picture_url: user.profilePictureUrl,
    image_cloudinary_id: user.imageCloudinaryId,
    gender: user.gender,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
};

export const getUserForAuth = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true, password: true },
  });
};

export const createUser = async (user: {
  name: string;
  username: string;
  email: string;
  password: string;
  gender: "male" | "female" | "other";
  age: number;
}) => {
  const created = await prisma.user.create({
    data: user,
    select: { id: true },
  });

  return created.id;
};

export const updateUser = async (
  id: number,
  data: {
    name: string;
    bio?: string | null;
    profile_picture_url?: string;
    image_cloudinary_id?: string;
  }
) => {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return false;
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      bio: data.bio ?? null,
      profilePictureUrl: data.profile_picture_url,
      imageCloudinaryId: data.image_cloudinary_id,
    },
  });

  return true;
};

export const getProfileByUsername = async (
  username: string,
  currentUserId: number
): Promise<UserProfileSummary | null> => {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: {
        select: {
          posts: true,
          followerLinks: true,
          followingLinks: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const followLink = await prisma.follower.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: user.id,
      },
    },
    select: { followerId: true },
  });

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    profile_picture_url: user.profilePictureUrl,
    gender: user.gender,
    age: user.age,
    post_count: user._count.posts,
    follower_count: user._count.followerLinks,
    following_count: user._count.followingLinks,
    is_followed: Boolean(followLink),
  };
};

export const addFollow = async (followingId: number, followerId: number) => {
  await prisma.follower.create({
    data: {
      followerId,
      followingId,
    },
  });

  return true;
};

export const removeFollow = async (unfollowedId: number, followerId: number) => {
  const deleted = await prisma.follower.deleteMany({
    where: {
      followerId,
      followingId: unfollowedId,
    },
  });

  return deleted.count > 0;
};
