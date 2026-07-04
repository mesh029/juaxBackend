import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { feedbackListSelect, toFeedbackDto } from "@/lib/feedback/dto";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const service = searchParams.get("service");

    const rows = await prisma.serviceFeedback.findMany({
      where: {
        ...(status ? { status: status as never } : undefined),
        ...(service ? { service: service as never } : undefined),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: feedbackListSelect,
    });

    const [total, avgRating] = await Promise.all([
      prisma.serviceFeedback.count({
        where: { status: "new" },
      }),
      prisma.serviceFeedback.aggregate({
        where: { rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

    return jsonWithCors(
      {
        feedback: rows.map(toFeedbackDto),
        summary: {
          newCount: total,
          avgRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : null,
        },
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
