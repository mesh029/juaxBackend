import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { MAMA_FUA_DISPATCH_FEE_KES } from "@/lib/laundry/pricing";
import { MAMA_FUA_TASKS } from "@/lib/laundry/mamafua-tasks";

export async function GET(request: Request) {
  return jsonWithCors(
    {
      dispatchFeeKes: MAMA_FUA_DISPATCH_FEE_KES,
      description:
        "A rider delivers a Mama Fua with full cleaning equipment. Pick the tasks you need done on-site.",
      tasks: MAMA_FUA_TASKS,
    },
    request,
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
