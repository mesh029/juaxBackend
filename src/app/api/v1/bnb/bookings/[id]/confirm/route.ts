import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { confirmBookingPaymentBodySchema } from "@/lib/bnb/schemas";
import { toBnbBookingDto } from "@/lib/bnb/dto";
import { confirmBnbBookingPayment } from "@/lib/bnb/bookings";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuth(request);
    const body = confirmBookingPaymentBodySchema.parse(await request.json().catch(() => ({})));
    const booking = await confirmBnbBookingPayment(user.id, params.id, body.mpesaReceipt);
    return jsonWithCors(
      {
        booking: toBnbBookingDto(booking),
        message: "Payment confirmed — exact address unlocked for this stay",
      },
      request,
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "not_found") {
        return jsonWithCors({ error: "not_found", message: "Booking not found" }, request, {
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
