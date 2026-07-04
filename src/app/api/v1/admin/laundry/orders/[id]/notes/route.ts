import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toLaundryOrderDto } from "@/lib/laundry/order-dto";
import { getLaundryOrderById } from "@/lib/laundry/orders";

const bodySchema = z.object({
  note: z.string().min(1).max(2000),
});

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireRole(request, ["admin"]);
    const body = bodySchema.parse(await request.json());

    const existing = await getLaundryOrderById(params.id);
    if (!existing) {
      return jsonWithCors({ error: "not_found", message: "Order not found" }, request, {
        status: 404,
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.laundryOrder.update({
        where: { id: params.id },
        data: { adminNotes: body.note },
        include: {
          station: { select: { name: true, code: true, address: true } },
          user: { select: { phoneE164: true, displayName: true } },
        },
      });

      await tx.laundryStatusEvent.create({
        data: {
          orderId: params.id,
          status: existing.status,
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
