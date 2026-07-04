import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toLaundryOrderDto } from "@/lib/laundry/order-dto";
import { getLaundryOrderForUser } from "@/lib/laundry/orders";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuth(request);
    const order = await getLaundryOrderForUser(user.id, params.id);
    if (!order) {
      return jsonWithCors({ error: "not_found", message: "Order not found" }, request, {
        status: 404,
      });
    }
    return jsonWithCors(toLaundryOrderDto(order), request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
