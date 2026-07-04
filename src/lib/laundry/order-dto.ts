import type { laundry_status, pickup_mode } from "@prisma/client";
import { mamaFuaTaskLabels } from "@/lib/laundry/mamafua-tasks";
import { laundryStepIndex, orderStepLabels } from "@/lib/laundry/status";
import { toTrackingEventDto } from "@/lib/laundry/tracking";
import type { laundry_actor_role, laundry_event_kind } from "@prisma/client";

type OrderWithStation = {
  id: string;
  pickupMode: pickup_mode;
  stationId: string | null;
  pickupAddress: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupCounty: string | null;
  loadKg: { toNumber(): number } | number;
  loadItems: number | null;
  tasks: string[];
  tasksFeeKes: number;
  scheduleDate: Date;
  scheduleBand: string;
  ratePerKg: number;
  pickupFeeKes: number;
  totalKes: number;
  status: laundry_status;
  paymentStatus: string;
  adminNotes: string | null;
  createdAt: Date;
  station?: { name: string; code: string; address: string } | null;
  user?: { phoneE164: string; displayName: string | null } | null;
  tracking?: {
    id: string;
    kind: laundry_event_kind;
    actorRole: laundry_actor_role;
    note: string | null;
    createdAt: Date;
    creator?: { displayName: string | null; phoneE164: string; role: string } | null;
  }[];
};

function loadKgNumber(loadKg: OrderWithStation["loadKg"]): number {
  return typeof loadKg === "number" ? loadKg : loadKg.toNumber();
}

export function toLaundryOrderDto(order: OrderWithStation, opts?: { includeUser?: boolean }) {
  const load = loadKgNumber(order.loadKg);
  const isMamafua = order.pickupMode === "mamafua";
  const steps = orderStepLabels(order.pickupMode);

  const pickupLabel = isMamafua
    ? `Mama Fua visit · ${order.pickupAddress ?? "On-site"}`
    : order.pickupMode === "station"
      ? (order.station?.name ?? "Station pickup")
      : (order.pickupAddress ?? "Door pickup");

  const taskLabels = mamaFuaTaskLabels(order.tasks);
  const loadLabel = isMamafua
    ? taskLabels.length
      ? taskLabels.join(", ")
      : "Mama Fua"
    : order.loadItems != null
      ? `${order.loadItems} items`
      : `${load} kg`;

  const dto: Record<string, unknown> = {
    id: order.id,
    pickupMode: order.pickupMode,
    serviceType: isMamafua ? "mamafua" : "laundry",
    stationId: order.stationId,
    pickupAddress: order.pickupAddress,
    pickupCoords:
      order.pickupLat != null && order.pickupLng != null
        ? { lat: order.pickupLat, lng: order.pickupLng }
        : null,
    pickupCounty: order.pickupCounty,
    pickupLabel,
    loadKg: load,
    loadItems: order.loadItems,
    loadLabel,
    tasks: order.tasks,
    taskLabels,
    tasksFeeKes: order.tasksFeeKes,
    scheduleDate: order.scheduleDate.toISOString().slice(0, 10),
    scheduleBand: order.scheduleBand,
    ratePerKg: order.ratePerKg,
    pickupFeeKes: order.pickupFeeKes,
    dispatchFeeKes: isMamafua ? order.pickupFeeKes : undefined,
    totalKes: order.totalKes,
    estimateKes: order.totalKes,
    status: order.status,
    paymentStatus: order.paymentStatus,
    adminNotes: order.adminNotes,
    steps: [...steps],
    currentStep: Math.max(0, laundryStepIndex(order.status)),
    etaMinutes: order.status === "delivered" ? 0 : isMamafua ? 90 : 35,
    createdAt: order.createdAt.toISOString(),
  };

  if (opts?.includeUser && order.user) {
    dto.customer = {
      phone: order.user.phoneE164,
      displayName: order.user.displayName,
    };
  }

  if (order.station) {
    dto.station = {
      name: order.station.name,
      code: order.station.code,
      address: order.station.address,
    };
  }

  if (order.tracking?.length) {
    dto.tracking = order.tracking.map(toTrackingEventDto);
  }

  return dto;
}
