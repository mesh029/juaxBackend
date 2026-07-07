import { prisma } from "@/lib/db";
import { canConfirmPilotPayment } from "@/lib/payments/dev";
import { getPlanById, type SubscriptionPlanId } from "@/lib/subscription-plans";

const subSelect = {
  id: true,
  plan: true,
  priceKes: true,
  startsAt: true,
  expiresAt: true,
  paymentStatus: true,
  mpesaReceipt: true,
  createdAt: true,
} as const;

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      paymentStatus: "success",
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
    select: subSelect,
  });
}

export async function createSubscription(userId: string, planId: SubscriptionPlanId) {
  const plan = getPlanById(planId);
  if (!plan) throw new Error("invalid_plan");

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + plan.durationHours * 60 * 60 * 1000);

  return prisma.subscription.create({
    data: {
      userId,
      plan: planId,
      priceKes: plan.priceKes,
      startsAt,
      expiresAt,
      paymentStatus: "pending",
    },
    select: subSelect,
  });
}

export async function confirmSubscriptionPayment(
  userId: string,
  subscriptionId: string,
  mpesaReceipt?: string,
) {
  if (!canConfirmPilotPayment(mpesaReceipt)) {
    throw new Error("payment_not_available");
  }

  const sub = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
    select: { id: true, paymentStatus: true },
  });
  if (!sub) throw new Error("not_found");
  if (sub.paymentStatus === "success") {
    return prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      select: subSelect,
    });
  }

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      paymentStatus: "success",
      mpesaReceipt: mpesaReceipt ?? `DEV-${Date.now()}`,
    },
    select: subSelect,
  });
}
