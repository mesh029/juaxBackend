import { z } from "zod";
import type { laundry_status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toLaundryOrderDto } from "@/lib/laundry/order-dto";
import { getLaundryOrderById } from "@/lib/laundry/orders";
import { canTransition } from "@/lib/laundry/status";

const bodySchema = z.object({
  status: z.enum([
    "requested",
    "pickup_scheduled",
    "collected",
    "processing",
    "ready",
    "delivered",
    "cancelled",
  ]),
  note: z.string().max(500).optional(),
});

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { user } = await requireRole(request, ["admin"]);
    const body = bodySchema.parse(await request.json());

    const existing = await getLaundryOrderById(params.id);
    if (!existing) {
      return jsonWithCors({ error: "not_found", message: "Order not found" }, request, {
        status: 404,
      });
    }

    if (!canTransition(existing.status, body.status as laundry_status)) {
      return jsonWithCors(
        {
          error: "invalid_transition",
          message: `Cannot move from ${existing.status} to ${body.status}`,
        },
        request,
        { status: 400 },
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.laundryOrder.update({
        where: { id: params.id },
        data: { status: body.status },
        include: {
          station: { select: { name: true, code: true, address: true } },
          user: { select: { phoneE164: true, displayName: true } },
        },
      });

      await tx.laundryStatusEvent.create({
        data: {
          orderId: params.id,
          status: body.status,
          note: body.note,
          createdBy: user.id,
        },
      });

      return updated;
    });

    return jsonWithCors(toLaundryOrderDto(order, { includeUser: true }), request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
