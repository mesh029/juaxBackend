import { getMamaFuaTask, normalizeMamaFuaTasks, type MamaFuaTaskId } from "@/lib/laundry/mamafua-tasks";

export const DEFAULT_RATE_PER_KG = 80;
export const DEFAULT_PICKUP_FEE_KES = 150;
/** Rider + Mama Fua travel with full cleaning kit */
export const MAMA_FUA_DISPATCH_FEE_KES = 600;

export type PickupMode = "door" | "station" | "mamafua";

export type PricingInput = {
  pickupMode: PickupMode;
  loadKg?: number;
  tasks?: string[];
};

export type TaskLineItem = {
  id: string;
  label: string;
  priceKes: number;
};

export type PricingResult = {
  ratePerKg: number;
  pickupFeeKes: number;
  tasksFeeKes: number;
  taskLineItems: TaskLineItem[];
  totalKes: number;
};

export function computeLaundryPricing(input: {
  pickupMode: "door" | "station";
  loadKg: number;
}): PricingResult {
  const ratePerKg = DEFAULT_RATE_PER_KG;
  const pickupFeeKes = input.pickupMode === "door" ? DEFAULT_PICKUP_FEE_KES : 0;
  const laundryKes = Math.round(input.loadKg * ratePerKg);
  return {
    ratePerKg,
    pickupFeeKes,
    tasksFeeKes: 0,
    taskLineItems: [],
    totalKes: laundryKes + pickupFeeKes,
  };
}

export function computeMamaFuaPricing(input: {
  tasks: string[];
  loadKg?: number;
}): PricingResult {
  const taskIds = normalizeMamaFuaTasks(input.tasks);
  const taskLineItems: TaskLineItem[] = taskIds.map((id) => {
    const task = getMamaFuaTask(id)!;
    return { id, label: task.label, priceKes: task.priceKes };
  });

  let tasksFeeKes = taskLineItems.reduce((sum, t) => sum + t.priceKes, 0);
  const ratePerKg = DEFAULT_RATE_PER_KG;
  const loadKg = input.loadKg ?? 0;

  if (taskIds.includes("laundry" as MamaFuaTaskId) && loadKg > 0) {
    const kgFee = Math.round(loadKg * ratePerKg);
    tasksFeeKes += kgFee;
    taskLineItems.push({
      id: "laundry_kg",
      label: `Laundry weight (${loadKg} kg)`,
      priceKes: kgFee,
    });
  }

  const pickupFeeKes = MAMA_FUA_DISPATCH_FEE_KES;

  return {
    ratePerKg,
    pickupFeeKes,
    tasksFeeKes,
    taskLineItems,
    totalKes: pickupFeeKes + tasksFeeKes,
  };
}

export function computeOrderPricing(input: PricingInput): PricingResult {
  if (input.pickupMode === "mamafua") {
    return computeMamaFuaPricing({
      tasks: input.tasks ?? [],
      loadKg: input.loadKg,
    });
  }
  return computeLaundryPricing({
    pickupMode: input.pickupMode,
    loadKg: input.loadKg ?? 4,
  });
}
