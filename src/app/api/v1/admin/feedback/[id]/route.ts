import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { feedbackPatchSchema } from "@/lib/feedback/schemas";
import { feedbackListSelect, toFeedbackDto } from "@/lib/feedback/dto";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const body = feedbackPatchSchema.parse(await request.json());

    const row = await prisma.serviceFeedback.update({
      where: { id: params.id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.adminNotes !== undefined && { adminNotes: body.adminNotes }),
      },
      select: feedbackListSelect,
    });

    return jsonWithCors({ feedback: toFeedbackDto(row) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
