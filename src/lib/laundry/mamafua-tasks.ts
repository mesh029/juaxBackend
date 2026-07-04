/** On-site tasks a Mama Fua can perform — rider delivers cleaner + equipment. */
export const MAMA_FUA_TASKS = [
  {
    id: "laundry",
    label: "Laundry (wash & fold)",
    description: "Clothes washed on-site or bagged for station",
    priceKes: 400,
    acceptsLoadKg: true,
  },
  {
    id: "vacuum_upholstery",
    label: "Vacuum chairs & sofas",
    description: "Upholstery and fabric surfaces",
    priceKes: 350,
    acceptsLoadKg: false,
  },
  {
    id: "wash_utensils",
    label: "Wash utensils & kitchen",
    description: "Sink, counters, dishes, and cookware",
    priceKes: 300,
    acceptsLoadKg: false,
  },
  {
    id: "mop_floors",
    label: "Mop & sweep floors",
    description: "All reachable floor areas",
    priceKes: 400,
    acceptsLoadKg: false,
  },
  {
    id: "bathroom_clean",
    label: "Bathroom deep clean",
    description: "Toilet, shower, tiles, and mirrors",
    priceKes: 450,
    acceptsLoadKg: false,
  },
  {
    id: "thorough_clean",
    label: "Thorough full-house clean",
    description: "Deep clean of all rooms — surfaces, dusting, floors",
    priceKes: 1500,
    acceptsLoadKg: false,
  },
  {
    id: "iron_clothes",
    label: "Iron & press clothes",
    description: "Pressing and folding ready-to-wear",
    priceKes: 250,
    acceptsLoadKg: false,
  },
  {
    id: "window_clean",
    label: "Windows & glass",
    description: "Interior windows, glass doors, mirrors",
    priceKes: 350,
    acceptsLoadKg: false,
  },
  {
    id: "bedding",
    label: "Change & wash bedding",
    description: "Sheets, duvets, and pillowcases",
    priceKes: 500,
    acceptsLoadKg: false,
  },
  {
    id: "fridge_clean",
    label: "Fridge & appliance wipe-down",
    description: "Fridge interior, microwave, cooker exterior",
    priceKes: 400,
    acceptsLoadKg: false,
  },
] as const;

export type MamaFuaTaskId = (typeof MAMA_FUA_TASKS)[number]["id"];

const taskById = new Map(MAMA_FUA_TASKS.map((t) => [t.id, t]));

export function getMamaFuaTask(id: string) {
  return taskById.get(id as MamaFuaTaskId);
}

export function normalizeMamaFuaTasks(selected: string[]): MamaFuaTaskId[] {
  const allowed = new Set<string>(MAMA_FUA_TASKS.map((t) => t.id));
  return [...new Set(selected.filter((id) => allowed.has(id)))] as MamaFuaTaskId[];
}

export function mamaFuaTaskLabels(taskIds: string[]): string[] {
  return taskIds
    .map((id) => getMamaFuaTask(id)?.label ?? id)
    .filter(Boolean);
}
