import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toLaundryOrderDto } from "@/lib/laundry/order-dto";
import { getLaundryOrderById } from "@/lib/laundry/orders";

type Params = { params: { id: string } };

/** Customer confirms delivery was received — unlocks review. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuth(request);
    const order = await getLaundryOrderById(params.id);

    if (!order) {
      return jsonWithCors({ error: "not_found", message: "Order not found" }, request, {
        status: 404,
      });
    }

    if (order.userId !== user.id) {
      return jsonWithCors({ error: "forbidden", message: "Not your order" }, request, {
        status: 403,
      });
    }

    if (order.status !== "delivered") {
      return jsonWithCors(
        {
          error: "not_ready",
          message: "Confirm delivery once your order is marked delivered",
        },
        request,
        { status: 400 },
      );
    }

    if (order.customerConfirmedAt) {
      return jsonWithCors(
        { ok: true, order: toLaundryOrderDto(order), message: "Already confirmed" },
        request,
      );
    }

    const updated = await prisma.laundryOrder.update({
      where: { id: params.id },
      data: { customerConfirmedAt: new Date() },
      include: {
        station: { select: { name: true, code: true, address: true } },
      },
    });

    return jsonWithCors(
      {
        ok: true,
        order: toLaundryOrderDto(updated),
        message: "Thanks — you can now rate this service",
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
