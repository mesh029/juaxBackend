import type { SubscriptionPlanId } from "@/lib/subscription-plans";

export type SubscriptionEligibility = {
  plan: SubscriptionPlanId;
  label: string;
  unlocks: string[];
};

const ELIGIBILITY: Record<SubscriptionPlanId, string[]> = {
  daily: [
    "Rental exact addresses & GPS pins",
    "Landlord / agent phone contact",
    "Submit rental viewing requests",
  ],
  weekly: [
    "Rental exact addresses & GPS pins",
    "Landlord / agent phone contact",
    "Submit rental viewing requests",
    "Priority follow-up on viewings (pilot)",
  ],
  monthly: [
    "Rental exact addresses & GPS pins",
    "Landlord / agent phone contact",
    "Submit rental viewing requests",
    "Priority follow-up on viewings (pilot)",
    "Extended access — best for active house hunters",
  ],
};

export function subscriptionEligibility(plan: string): SubscriptionEligibility {
  const id = (["daily", "weekly", "monthly"].includes(plan) ? plan : "weekly") as SubscriptionPlanId;
  const labels: Record<SubscriptionPlanId, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };
  return {
    plan: id,
    label: labels[id],
    unlocks: ELIGIBILITY[id],
  };
}
