import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toBnbBookingDto } from "@/lib/bnb/dto";
import { createBnbBooking, getUserBnbBookings } from "@/lib/bnb/bookings";
import { bnbBookingBodySchema } from "@/lib/bnb/schemas";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const bookings = await getUserBnbBookings(user.id);
    return jsonWithCors(bookings.map((b) => toBnbBookingDto(b)), request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const body = bnbBookingBodySchema.parse(await request.json());
    const booking = await createBnbBooking(user.id, body);
    return jsonWithCors(
      {
        booking: toBnbBookingDto(booking),
        message: "Booking created — complete M-Pesa payment to confirm your stay",
      },
      request,
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "invalid_listing") {
        return jsonWithCors({ error: "invalid_listing", message: "BnB listing not found" }, request, {
          status: 400,
        });
      }
      if (err.message === "invalid_dates") {
        return jsonWithCors(
          { error: "invalid_dates", message: "Check-out must be after check-in" },
          request,
          { status: 400 },
        );
      }
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
