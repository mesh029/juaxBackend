import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toSubscriptionDto } from "@/lib/subscriptions/dto";
import { getActiveSubscription } from "@/lib/subscriptions/service";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const sub = await getActiveSubscription(user.id);
    return jsonWithCors(
      {
        active: !!sub,
        subscription: sub ? toSubscriptionDto(sub) : null,
      },
      request,
    );
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
