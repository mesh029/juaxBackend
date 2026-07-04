import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import {
  feedbackBodySchema,
  validateFeedbackBody,
} from "@/lib/feedback/schemas";
import { toFeedbackDto } from "@/lib/feedback/dto";

export async function POST(request: Request) {
  try {
    let userId: string | undefined;
    try {
      const { user } = await requireAuth(request);
      userId = user.id;
    } catch {
      /* anonymous feedback allowed for general/app */
    }

    const body = feedbackBodySchema.parse(await request.json());
    const validationError = validateFeedbackBody(body);
    if (validationError) {
      return jsonWithCors({ error: "validation_error", message: validationError }, request, {
        status: 400,
      });
    }

    if (!userId && body.service !== "general" && body.service !== "app") {
      return jsonWithCors(
        { error: "unauthorized", message: "Sign in to submit service feedback" },
        request,
        { status: 401 },
      );
    }

    if (body.orderId) {
      const order = await prisma.laundryOrder.findFirst({
        where: userId ? { id: body.orderId, userId } : { id: body.orderId },
        select: { id: true },
      });
      if (!order) {
        return jsonWithCors({ error: "not_found", message: "Order not found" }, request, {
          status: 404,
        });
      }
    }

    const row = await prisma.serviceFeedback.create({
      data: {
        userId: userId ?? null,
        service: body.service,
        category: body.category,
        rating: body.rating,
        title: body.title,
        body: body.body,
        orderId: body.orderId,
        listingId: body.listingId,
      },
      select: {
        id: true,
        service: true,
        category: true,
        rating: true,
        title: true,
        body: true,
        orderId: true,
        listingId: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonWithCors({ feedback: toFeedbackDto(row) }, request, { status: 201 });
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
