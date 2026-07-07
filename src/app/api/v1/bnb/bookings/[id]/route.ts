import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toBnbBookingDto } from "@/lib/bnb/dto";
import { getUserBnbBooking } from "@/lib/bnb/bookings";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuth(request);
    const booking = await getUserBnbBooking(user.id, params.id);
    if (!booking) {
      return jsonWithCors({ error: "not_found", message: "Booking not found" }, request, {
        status: 404,
      });
    }
    return jsonWithCors(toBnbBookingDto(booking), request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
