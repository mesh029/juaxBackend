import { z } from "zod";
import type { laundry_event_kind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getLaundryOrderById } from "@/lib/laundry/orders";
import { toLaundryOrderDto } from "@/lib/laundry/order-dto";
import { logLaundryTrackingEvent, syncOrderStatusFromTracking, toTrackingEventDto } from "@/lib/laundry/tracking";
import { ACTOR_FOR_USER_ROLE } from "@/lib/laundry/tracking-events";

const bodySchema = z.object({
  kind: z.enum([
    "order_placed",
    "customer_dropped_at_station",
    "items_received_at_station",
    "rider_assigned",
    "rider_en_route",
    "items_picked_up",
    "received_at_hub",
    "washing_started",
    "washing_complete",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered_to_customer",
    "customer_collected",
    "mamafua_dispatched",
    "mamafua_arrived",
    "cleaning_started",
    "cleaning_complete",
    "visit_completed",
    "note",
  ] as [laundry_event_kind, ...laundry_event_kind[]]),
  note: z.string().max(500).optional(),
});

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireRole(request, ["admin", "agent"]);
    const body = bodySchema.parse(await request.json());

    const order = await getLaundryOrderById(params.id);
    if (!order) {
      return jsonWithCors({ error: "not_found", message: "Order not found" }, request, {
        status: 404,
      });
    }

    const actorRole = ACTOR_FOR_USER_ROLE[user.role] ?? "admin";

    const event = await logLaundryTrackingEvent({
      orderId: params.id,
      kind: body.kind,
      actorRole,
      createdBy: user.id,
      note: body.note,
    });

    await syncOrderStatusFromTracking({
      orderId: params.id,
      kind: body.kind,
      pickupMode: order.pickupMode,
      currentStatus: order.status,
      createdBy: user.id,
    });

    const refreshed = await getLaundryOrderById(params.id);

    return jsonWithCors(
      { ok: true, event: toTrackingEventDto(event), order: refreshed ? toLaundryOrderDto(refreshed, { includeUser: true }) : null },
      request,
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
