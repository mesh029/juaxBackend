import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { confirmPaymentBodySchema } from "@/lib/subscriptions/schemas";
import { toSubscriptionDto } from "@/lib/subscriptions/dto";
import { confirmSubscriptionPayment } from "@/lib/subscriptions/service";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuth(request);
    const body = confirmPaymentBodySchema.parse(await request.json().catch(() => ({})));
    const sub = await confirmSubscriptionPayment(user.id, params.id, body.mpesaReceipt);
    return jsonWithCors(
      {
        subscription: toSubscriptionDto(sub),
        message: "Payment confirmed — rental locations unlocked",
      },
      request,
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "not_found") {
        return jsonWithCors({ error: "not_found", message: "Subscription not found" }, request, {
          status: 404,
        });
      }
      if (err.message === "payment_not_available") {
        return jsonWithCors(
          { error: "payment_not_available", message: "M-Pesa payments are not enabled yet" },
          request,
          { status: 503 },
        );
      }
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
