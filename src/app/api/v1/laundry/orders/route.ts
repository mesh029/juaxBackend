import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toLaundryOrderDto } from "@/lib/laundry/order-dto";
import {
  createLaundryOrder,
  getUserLaundryOrders,
} from "@/lib/laundry/orders";
import {
  laundryOrderBodySchema,
  validateLaundryOrderBody,
} from "@/lib/laundry/schemas";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const orders = await getUserLaundryOrders(user.id);
    return jsonWithCors(orders.map((o) => toLaundryOrderDto(o)), request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const body = laundryOrderBodySchema.parse(await request.json());
    const validationError = validateLaundryOrderBody(body);
    if (validationError) {
      return jsonWithCors({ error: "validation_error", message: validationError }, request, {
        status: 400,
      });
    }

    const order = await createLaundryOrder(user.id, body);
    return jsonWithCors(toLaundryOrderDto(order), request, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_station") {
      return jsonWithCors({ error: "invalid_station", message: "Station not found" }, request, {
        status: 400,
      });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
