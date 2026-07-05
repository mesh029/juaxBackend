import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { MAMA_FUA_DISPATCH_FEE_KES } from "@/lib/laundry/pricing";
import { MAMA_FUA_TASKS } from "@/lib/laundry/mamafua-tasks";
import {
  listMamaFuaConvenienceBands,
  MAMA_FUA_ORDER_INPUT_HINT,
} from "@/lib/laundry/convenience-times";

export async function GET(request: Request) {
  return jsonWithCors(
    {
      dispatchFeeKes: MAMA_FUA_DISPATCH_FEE_KES,
      description:
        "A rider delivers a Mama Fua with full cleaning equipment. Pick the tasks you need done on-site.",
      tasks: MAMA_FUA_TASKS,
      convenienceTimes: listMamaFuaConvenienceBands(),
      orderInput: MAMA_FUA_ORDER_INPUT_HINT,
    },
    request,
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
