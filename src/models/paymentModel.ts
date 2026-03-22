import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export interface CreateStripeCustomerData {
  userId: number;
  email: string;
  stripeCustomerId: string;
}

export interface CreateStripeCheckoutSessionData {
  userId: number;
  stripeSessionId: string;
  stripeCustomerId?: string;
  stripePriceId: string;
  mode: "payment" | "subscription";
  currency: string;
  amountTotal?: number;
  status: string;
  expiresAt?: Date;
}

export interface UpsertStripeSubscriptionData {
  userId: number;
  stripeSubscriptionId: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  status: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
}

export interface UpsertStripePaymentData {
  userId: number;
  stripePaymentIntentId: string;
  stripeCheckoutSessionId?: string;
  stripeCustomerId?: string;
  amount?: number;
  currency?: string;
  status: string;
}

export const getUserEmailById = async (userId: number): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return user?.email ?? null;
};

export const getStripeCustomerByUserId = async (userId: number): Promise<string | null> => {
  const customer = await prisma.stripeCustomer.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  return customer?.stripeCustomerId ?? null;
};

export const getUserIdByStripeCustomerId = async (
  stripeCustomerId: string
): Promise<number | null> => {
  const customer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId },
    select: { userId: true },
  });

  return customer?.userId ?? null;
};

export const createStripeCustomer = async (data: CreateStripeCustomerData): Promise<void> => {
  await prisma.stripeCustomer.create({
    data: {
      userId: data.userId,
      email: data.email,
      stripeCustomerId: data.stripeCustomerId,
    },
  });
};

export const createStripeCheckoutSession = async (
  data: CreateStripeCheckoutSessionData
): Promise<void> => {
  await prisma.stripeCheckoutSession.create({
    data: {
      userId: data.userId,
      stripeSessionId: data.stripeSessionId,
      stripeCustomerId: data.stripeCustomerId,
      stripePriceId: data.stripePriceId,
      mode: data.mode,
      currency: data.currency,
      amountTotal: data.amountTotal,
      status: data.status,
      expiresAt: data.expiresAt,
    },
  });
};

export const updateStripeCheckoutSessionStatus = async (
  stripeSessionId: string,
  status: string
): Promise<void> => {
  await prisma.stripeCheckoutSession.updateMany({
    where: { stripeSessionId },
    data: { status },
  });
};

export const getStripeCheckoutSessionBySessionId = async (stripeSessionId: string) => {
  return prisma.stripeCheckoutSession.findUnique({
    where: { stripeSessionId },
    select: {
      userId: true,
      mode: true,
      stripePriceId: true,
      stripeCustomerId: true,
    },
  });
};

export const upsertStripeSubscription = async (
  data: UpsertStripeSubscriptionData
): Promise<void> => {
  await prisma.stripeSubscription.upsert({
    where: { stripeSubscriptionId: data.stripeSubscriptionId },
    create: {
      userId: data.userId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeCustomerId: data.stripeCustomerId,
      stripePriceId: data.stripePriceId,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      canceledAt: data.canceledAt,
    },
    update: {
      stripeCustomerId: data.stripeCustomerId,
      stripePriceId: data.stripePriceId,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      canceledAt: data.canceledAt,
    },
  });
};

export const getStripeSubscriptionByUserAndStripeId = async (
  userId: number,
  stripeSubscriptionId: string
) => {
  return prisma.stripeSubscription.findFirst({
    where: {
      userId,
      stripeSubscriptionId,
    },
    select: {
      stripeSubscriptionId: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      canceledAt: true,
    },
  });
};

export const upsertStripePayment = async (data: UpsertStripePaymentData): Promise<void> => {
  await prisma.stripePayment.upsert({
    where: { stripePaymentIntentId: data.stripePaymentIntentId },
    create: {
      userId: data.userId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId,
      stripeCustomerId: data.stripeCustomerId,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
    },
    update: {
      stripeCheckoutSessionId: data.stripeCheckoutSessionId,
      stripeCustomerId: data.stripeCustomerId,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
    },
  });
};

export const createWebhookEventIfNew = async (
  stripeEventId: string,
  eventType: string,
  payload: Prisma.InputJsonValue
): Promise<boolean> => {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId,
        eventType,
        payload,
      },
    });

    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }

    throw error;
  }
};

export const markWebhookEventProcessed = async (stripeEventId: string): Promise<void> => {
  await prisma.stripeWebhookEvent.update({
    where: { stripeEventId },
    data: { processedAt: new Date() },
  });
};

export const getLatestSubscriptionByUserId = async (userId: number) => {
  const subscription = await prisma.stripeSubscription.findFirst({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      stripeSubscriptionId: true,
      stripePriceId: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      canceledAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!subscription) {
    return null;
  }

  return {
    stripe_subscription_id: subscription.stripeSubscriptionId,
    stripe_price_id: subscription.stripePriceId,
    status: subscription.status,
    current_period_end: subscription.currentPeriodEnd,
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    canceled_at: subscription.canceledAt,
    created_at: subscription.createdAt,
    updated_at: subscription.updatedAt,
  };
};

export const getLatestPaymentByUserId = async (userId: number) => {
  const payment = await prisma.stripePayment.findFirst({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!payment) {
    return null;
  }

  return {
    stripe_payment_intent_id: payment.stripePaymentIntentId,
    stripe_checkout_session_id: payment.stripeCheckoutSessionId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
  };
};

export const getCheckoutHistoryByUserId = async (
  limit: number,
  cursor: number | undefined,
  userId: number
) => {
  const sessions = await prisma.stripeCheckoutSession.findMany({
    where: {
      userId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      stripeSessionId: true,
      mode: true,
      stripePriceId: true,
      currency: true,
      amountTotal: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    stripe_session_id: session.stripeSessionId,
    mode: session.mode,
    stripe_price_id: session.stripePriceId,
    currency: session.currency,
    amount_total: session.amountTotal,
    status: session.status,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  }));
};
