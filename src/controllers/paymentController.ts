import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { stripe, getStripeWebhookSecret } from "../config/stripe.js";
import { handlePaginatedRequest } from "../utils/handlePaginatedRequest.js";
import * as PaymentModel from "../models/paymentModel.js";

const getStripePriceIdByPaymentType = (paymentType: string): string | null => {
  if (paymentType === "one_time") {
    return process.env.STRIPE_PRICE_ONE_TIME_USD ?? null;
  }

  if (paymentType === "subscription") {
    return process.env.STRIPE_PRICE_SUBSCRIPTION_MONTHLY_USD ?? null;
  }

  return null;
};

const getUserIdFromStripeCustomer = async (
  stripeCustomer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<number | null> => {
  if (!stripeCustomer || typeof stripeCustomer !== "string") {
    return null;
  }

  return PaymentModel.getUserIdByStripeCustomerId(stripeCustomer);
};

const getSubscriptionCurrentPeriodEnd = (subscription: Stripe.Subscription): Date | undefined => {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  return currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined;
};

const ensureStripeCustomer = async (userId: number): Promise<string> => {
  const existingCustomerId = await PaymentModel.getStripeCustomerByUserId(userId);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const email = await PaymentModel.getUserEmailById(userId);
  if (!email) {
    throw new Error("User email not found");
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: String(userId),
    },
  });

  try {
    await PaymentModel.createStripeCustomer({
      userId,
      email,
      stripeCustomerId: customer.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const racedCustomerId = await PaymentModel.getStripeCustomerByUserId(userId);
      if (racedCustomerId) {
        return racedCustomerId;
      }
    }

    throw error;
  }

  return customer.id;
};

export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { payment_type, success_url, cancel_url } = req.body as {
    payment_type: "one_time" | "subscription";
    success_url: string;
    cancel_url: string;
  };

  const stripePriceId = getStripePriceIdByPaymentType(payment_type);
  if (!stripePriceId) {
    res.status(500).json({ message: "Stripe price ID is not configured." });
    return;
  }

  const mode = payment_type === "subscription" ? "subscription" : "payment";

  try {
    const stripeCustomerId = await ensureStripeCustomer(userId);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode,
      customer: stripeCustomerId,
      line_items: [{
        price: stripePriceId,
        quantity: 1,
      }],
      success_url,
      cancel_url,
      metadata: {
        user_id: String(userId),
        payment_type,
      },
      payment_intent_data:
        mode === "payment"
          ? {
              metadata: {
                user_id: String(userId),
              },
            }
          : undefined,
      subscription_data:
        mode === "subscription"
          ? {
              metadata: {
                user_id: String(userId),
              },
            }
          : undefined,
    });

    await PaymentModel.createStripeCheckoutSession({
      userId,
      stripeSessionId: checkoutSession.id,
      stripeCustomerId,
      stripePriceId,
      mode,
      currency: checkoutSession.currency ?? "usd",
      amountTotal: checkoutSession.amount_total ?? undefined,
      status: checkoutSession.status ?? "open",
      expiresAt: checkoutSession.expires_at
        ? new Date(checkoutSession.expires_at * 1000)
        : undefined,
    });

    res.status(201).json({
      message: "Checkout session created successfully",
      stripe_session_id: checkoutSession.id,
      checkout_url: checkoutSession.url,
      payment_type,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      res.status(400).json({ message: error.message });
      return;
    }

    console.error("Error creating checkout session:", error);
    res.status(500).json({ message: "Error creating checkout session" });
  }
};

export const getMyBillingStatus = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const [subscription, latestPayment] = await Promise.all([
      PaymentModel.getLatestSubscriptionByUserId(userId),
      PaymentModel.getLatestPaymentByUserId(userId),
    ]);

    res.status(200).json({
      message: "Billing status fetched successfully",
      subscription,
      latest_payment: latestPayment,
    });
  } catch (error) {
    console.error("Error fetching billing status:", error);
    res.status(500).json({ message: "Error fetching billing status" });
  }
};

export const getMyBillingHistory = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const modelCall = (limit: number, cursor?: number) =>
    PaymentModel.getCheckoutHistoryByUserId(limit, cursor, userId);

  await handlePaginatedRequest(req, res, "history", modelCall);
};

export const cancelMySubscription = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { stripe_subscription_id } = req.body as { stripe_subscription_id: string };

  try {
    const existingSubscription = await PaymentModel.getStripeSubscriptionByUserAndStripeId(
      userId,
      stripe_subscription_id
    );

    if (!existingSubscription) {
      res.status(404).json({ message: "Subscription not found" });
      return;
    }

    const updatedSubscription = (await stripe.subscriptions.update(stripe_subscription_id, {
      cancel_at_period_end: true,
    })) as unknown as Stripe.Subscription;

    await PaymentModel.upsertStripeSubscription({
      userId,
      stripeSubscriptionId: updatedSubscription.id,
      stripeCustomerId:
        typeof updatedSubscription.customer === "string"
          ? updatedSubscription.customer
          : undefined,
      stripePriceId: updatedSubscription.items.data[0]?.price.id,
      status: updatedSubscription.status,
      currentPeriodEnd: getSubscriptionCurrentPeriodEnd(updatedSubscription),
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      canceledAt: updatedSubscription.canceled_at
        ? new Date(updatedSubscription.canceled_at * 1000)
        : undefined,
    });

    res.status(200).json({
      message: "Subscription scheduled for cancellation",
      subscription: {
        stripe_subscription_id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        current_period_end: getSubscriptionCurrentPeriodEnd(updatedSubscription) ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      res.status(400).json({ message: error.message });
      return;
    }

    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Error cancelling subscription" });
  }
};

export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).json({ message: "Missing Stripe signature" });
    return;
  }

  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ message: "Invalid webhook payload" });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("Error verifying Stripe webhook signature:", error);
    res.status(400).json({ message: "Invalid Stripe signature" });
    return;
  }

  try {
    const isNewEvent = await PaymentModel.createWebhookEventIfNew(
      event.id,
      event.type,
      event as unknown as Prisma.InputJsonValue
    );

    if (!isNewEvent) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await PaymentModel.updateStripeCheckoutSessionStatus(session.id, session.status ?? "complete");

        if (session.mode === "subscription" && typeof session.subscription === "string") {
          const subscription = (await stripe.subscriptions.retrieve(
            session.subscription
          )) as unknown as Stripe.Subscription;
          let userId = session.metadata?.user_id ? Number.parseInt(session.metadata.user_id, 10) : NaN;

          if (Number.isNaN(userId)) {
            const sessionRecord = await PaymentModel.getStripeCheckoutSessionBySessionId(session.id);
            userId = sessionRecord?.userId ?? NaN;
          }

          if (!Number.isNaN(userId)) {
            await PaymentModel.upsertStripeSubscription({
              userId,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId:
                typeof subscription.customer === "string" ? subscription.customer : undefined,
              stripePriceId: subscription.items.data[0]?.price.id,
              status: subscription.status,
              currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : undefined,
            });
          }
        }

        break;
      }
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        let userId = intent.metadata?.user_id ? Number.parseInt(intent.metadata.user_id, 10) : NaN;

        if (Number.isNaN(userId)) {
          const userIdFromCustomer = await getUserIdFromStripeCustomer(intent.customer);
          userId = userIdFromCustomer ?? NaN;
        }

        if (!Number.isNaN(userId)) {
          await PaymentModel.upsertStripePayment({
            userId,
            stripePaymentIntentId: intent.id,
            stripeCustomerId: typeof intent.customer === "string" ? intent.customer : undefined,
            amount: intent.amount ?? undefined,
            currency: intent.currency ?? undefined,
            status: intent.status,
          });
        }

        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.user_id
          ? Number.parseInt(subscription.metadata.user_id, 10)
          : NaN;

        if (Number.isNaN(userId)) {
          const userIdFromCustomer = await getUserIdFromStripeCustomer(subscription.customer);
          userId = userIdFromCustomer ?? NaN;
        }

        if (!Number.isNaN(userId)) {
          await PaymentModel.upsertStripeSubscription({
            userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId:
              typeof subscription.customer === "string" ? subscription.customer : undefined,
            stripePriceId: subscription.items.data[0]?.price.id,
            status: subscription.status,
            currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
          });
        }

        break;
      }
      default:
        break;
    }

    await PaymentModel.markWebhookEventProcessed(event.id);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    res.status(500).json({ message: "Error handling webhook" });
  }
};
