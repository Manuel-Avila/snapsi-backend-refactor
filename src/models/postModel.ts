import { prisma } from "../config/prisma.js";

interface PostRow {
  id: number;
  image_url: string;
  caption: string | null;
  created_at: Date;
  image_cloudinary_id: string | null;
  user: {
    id: number;
    name: string;
    username: string;
    profile_picture_url: string | null;
  };
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
}

const mapPostRow = async (postId: number, currentUserId: number): Promise<PostRow> => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: true,
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  const [liked, bookmarked] = await Promise.all([
    prisma.postLike.findUnique({
      where: { userId_postId: { userId: currentUserId, postId } },
      select: { postId: true },
    }),
    prisma.bookmark.findUnique({
      where: { userId_postId: { userId: currentUserId, postId } },
      select: { postId: true },
    }),
  ]);

  return {
    id: post.id,
    image_url: post.imageUrl,
    caption: post.caption,
    created_at: post.createdAt,
    image_cloudinary_id: post.imageCloudinaryId,
    user: {
      id: post.user.id,
      name: post.user.name,
      username: post.user.username,
      profile_picture_url: post.user.profilePictureUrl,
    },
    like_count: post._count.likes,
    comment_count: post._count.comments,
    is_liked: Boolean(liked),
    is_bookmarked: Boolean(bookmarked),
  };
};

const getPostsBase = async (
  where: Record<string, unknown>,
  limit: number,
  cursor: number | undefined,
  currentUserId: number
) => {
  const posts = await prisma.post.findMany({
    where: {
      ...(where as object),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { id: true },
  });

  return Promise.all(posts.map((item) => mapPostRow(item.id, currentUserId)));
};

export const getPosts = async (limit: number, cursor: number | undefined, currentUserId: number) => {
  return getPostsBase({}, limit, cursor, currentUserId);
};

export const getPostsByUsername = async (
  limit: number,
  cursor: number | undefined,
  currentUserId: number,
  username: string
) => {
  return getPostsBase({ user: { username } }, limit, cursor, currentUserId);
};

export const getBookmarkedPosts = async (
  limit: number,
  cursor: number | undefined,
  currentUserId: number
) => {
  return getPostsBase(
    {
      bookmarks: {
        some: {
          userId: currentUserId,
        },
      },
    },
    limit,
    cursor,
    currentUserId
  );
};

export const getPostById = async (postId: number, currentUserId: number) => {
  const found = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!found) {
    return null;
  }

  return mapPostRow(postId, currentUserId);
};

export const createPost = async (post: {
  user_id: number;
  caption?: string;
  image_url: string;
  image_cloudinary_id: string;
}) => {
  const created = await prisma.post.create({
    data: {
      userId: post.user_id,
      caption: post.caption,
      imageUrl: post.image_url,
      imageCloudinaryId: post.image_cloudinary_id,
    },
    select: { id: true },
  });

  return created.id;
};

export const deletePost = async (postId: number, userId: number) => {
  const deleted = await prisma.post.deleteMany({
    where: {
      id: postId,
      userId,
    },
  });

  return deleted.count > 0;
};

export const addLike = async (postId: number, userId: number) => {
  await prisma.postLike.create({
    data: {
      postId,
      userId,
    },
  });

  return true;
};

export const removeLike = async (postId: number, userId: number) => {
  const removed = await prisma.postLike.deleteMany({ where: { postId, userId } });
  return removed.count > 0;
};

export const addBookmark = async (postId: number, userId: number) => {
  await prisma.bookmark.create({
    data: {
      postId,
      userId,
    },
  });

  return true;
};

export const removeBookmark = async (postId: number, userId: number) => {
  const removed = await prisma.bookmark.deleteMany({ where: { postId, userId } });
  return removed.count > 0;
};
