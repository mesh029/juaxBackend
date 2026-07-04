export type SubscriptionPlanId = "daily" | "weekly" | "monthly";

export type SubscriptionPlan = {
  plan: SubscriptionPlanId;
  priceKes: number;
  durationHours: number;
  label: string;
};

/** MVP defaults — admin-configurable in Phase 7. */
const PLANS: SubscriptionPlan[] = [
  { plan: "daily", priceKes: 99, durationHours: 24, label: "Daily" },
  { plan: "weekly", priceKes: 299, durationHours: 24 * 7, label: "Weekly" },
  { plan: "monthly", priceKes: 599, durationHours: 24 * 30, label: "Monthly" },
];

export function getSubscriptionPlans(): SubscriptionPlan[] {
  return PLANS.map((p) => ({ ...p }));
}

export function getPlanById(plan: SubscriptionPlanId): SubscriptionPlan | undefined {
  return PLANS.find((p) => p.plan === plan);
}
