import type { Subscription } from "@prisma/client";
import { subscriptionEligibility } from "@/lib/subscriptions/eligibility";

type SubRow = Pick<
  Subscription,
  | "id"
  | "plan"
  | "priceKes"
  | "startsAt"
  | "expiresAt"
  | "paymentStatus"
  | "mpesaReceipt"
  | "createdAt"
> & {
  user?: {
    id: string;
    phoneE164: string;
    displayName: string | null;
    county: string | null;
  };
};

export function toSubscriptionDto(row: SubRow) {
  const now = Date.now();
  const active =
    row.paymentStatus === "success" && row.expiresAt.getTime() > now;
  const eligibility = subscriptionEligibility(row.plan);
  return {
    id: row.id,
    plan: row.plan,
    priceKes: row.priceKes,
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    paymentStatus: row.paymentStatus,
    mpesaReceipt: row.mpesaReceipt,
    createdAt: row.createdAt.toISOString(),
    active,
    eligibility,
  };
}

export function toAdminSubscriptionDto(row: SubRow) {
  const base = toSubscriptionDto(row);
  return {
    ...base,
    userId: row.user?.id,
    customer: row.user
      ? {
          id: row.user.id,
          phone: row.user.phoneE164,
          displayName: row.user.displayName,
          county: row.user.county,
        }
      : null,
  };
}
