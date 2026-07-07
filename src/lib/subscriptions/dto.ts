import type { Subscription } from "@prisma/client";

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
>;

export function toSubscriptionDto(row: SubRow) {
  const now = Date.now();
  const active =
    row.paymentStatus === "success" && row.expiresAt.getTime() > now;
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
  };
}
