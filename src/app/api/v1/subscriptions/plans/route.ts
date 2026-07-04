import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { getSubscriptionPlans } from "@/lib/subscription-plans";

export async function GET(request: Request) {
  return jsonWithCors({ plans: getSubscriptionPlans() }, request);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
