import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toAdminSubscriptionDto } from "@/lib/subscriptions/dto";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get("plan");
    const paymentStatus = searchParams.get("paymentStatus");
    const activeOnly = searchParams.get("active") === "true";

    const rows = await prisma.subscription.findMany({
      where: {
        ...(plan ? { plan: plan as never } : undefined),
        ...(paymentStatus ? { paymentStatus: paymentStatus as never } : undefined),
        ...(activeOnly
          ? { paymentStatus: "success", expiresAt: { gt: new Date() } }
          : undefined),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        plan: true,
        priceKes: true,
        startsAt: true,
        expiresAt: true,
        paymentStatus: true,
        mpesaReceipt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            phoneE164: true,
            displayName: true,
            county: true,
          },
        },
      },
    });

    const activeCount = await prisma.subscription.count({
      where: { paymentStatus: "success", expiresAt: { gt: new Date() } },
    });

    return jsonWithCors(
      {
        subscriptions: rows.map(toAdminSubscriptionDto),
        summary: { total: rows.length, activeCount },
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
