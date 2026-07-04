import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { computeOrderPricing } from "@/lib/laundry/pricing";
import {
  laundryOrderBodySchema,
  validateLaundryOrderBody,
} from "@/lib/laundry/schemas";

export async function POST(request: Request) {
  try {
    await requireAuth(request);
    const body = laundryOrderBodySchema.parse(await request.json());
    const validationError = validateLaundryOrderBody(body);
    if (validationError) {
      return jsonWithCors({ error: "validation_error", message: validationError }, request, {
        status: 400,
      });
    }

    const pricing = computeOrderPricing({
      pickupMode: body.pickupMode,
      loadKg: body.loadKg,
      tasks: body.tasks,
    });

    return jsonWithCors(
      {
        ratePerKg: pricing.ratePerKg,
        pickupFeeKes: pricing.pickupFeeKes,
        dispatchFeeKes: body.pickupMode === "mamafua" ? pricing.pickupFeeKes : undefined,
        tasksFeeKes: pricing.tasksFeeKes,
        taskLineItems: pricing.taskLineItems,
        totalKes: pricing.totalKes,
        estimateKes: pricing.totalKes,
        loadKg: body.loadKg,
        pickupMode: body.pickupMode,
        tasks: body.tasks,
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
