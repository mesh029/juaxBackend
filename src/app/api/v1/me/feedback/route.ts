import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { feedbackListSelect, toFeedbackDto } from "@/lib/feedback/dto";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const url = new URL(request.url);
    const service = url.searchParams.get("service");

    const rows = await prisma.serviceFeedback.findMany({
      where: {
        userId: user.id,
        ...(service ? { service: service as "fua" | "mamafua" | "bnb" | "rental" | "general" | "app" } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: feedbackListSelect,
    });

    return jsonWithCors({ feedback: rows.map((r) => toFeedbackDto(r)) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
