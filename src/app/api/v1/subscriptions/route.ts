import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toSubscriptionDto } from "@/lib/subscriptions/dto";
import {
  createSubscription,
  getActiveSubscription,
} from "@/lib/subscriptions/service";
import { subscriptionBodySchema } from "@/lib/subscriptions/schemas";
import type { SubscriptionPlanId } from "@/lib/subscription-plans";

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const body = subscriptionBodySchema.parse(await request.json());
    const sub = await createSubscription(user.id, body.plan as SubscriptionPlanId);
    return jsonWithCors(
      {
        subscription: toSubscriptionDto(sub),
        message: "Subscription created — complete M-Pesa payment to unlock rentals",
      },
      request,
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_plan") {
      return jsonWithCors({ error: "invalid_plan", message: "Unknown plan" }, request, {
        status: 400,
      });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
