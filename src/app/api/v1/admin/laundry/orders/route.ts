import { z } from "zod";
import type { laundry_status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toLaundryOrderDto } from "@/lib/laundry/order-dto";
import { getAdminLaundryOrders } from "@/lib/laundry/orders";
import { canTransition } from "@/lib/laundry/status";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const orders = await getAdminLaundryOrders(status ?? undefined);
    return jsonWithCors(
      orders.map((o) => toLaundryOrderDto(o, { includeUser: true })),
      request,
    );
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
