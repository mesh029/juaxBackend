import type { laundry_actor_role, laundry_event_kind, laundry_status } from "@prisma/client";

export type TrackingEventDef = {
  kind: laundry_event_kind;
  label: string;
  description: string;
  /** Who typically logs this */
  actorRole: laundry_actor_role;
  /** pickup modes this applies to; empty = all */
  modes: ("door" | "station" | "mamafua")[];
};

export const LAUNDRY_TRACKING_EVENTS: TrackingEventDef[] = [
  {
    kind: "order_placed",
    label: "Order placed",
    description: "Customer submitted the request",
    actorRole: "customer",
    modes: [],
  },
  {
    kind: "customer_dropped_at_station",
    label: "Customer dropped at station",
    description: "Customer left items at the Mama Fua hub",
    actorRole: "customer",
    modes: ["station"],
  },
  {
    kind: "items_received_at_station",
    label: "Items received at station",
    description: "Station staff confirmed items in",
    actorRole: "station",
    modes: ["station"],
  },
  {
    kind: "rider_assigned",
    label: "Rider assigned",
    description: "Ops assigned a rider to this order",
    actorRole: "admin",
    modes: ["door", "mamafua"],
  },
  {
    kind: "rider_en_route",
    label: "Rider en route",
    description: "Rider is heading to pickup / visit address",
    actorRole: "rider",
    modes: ["door", "mamafua"],
  },
  {
    kind: "items_picked_up",
    label: "Items picked up",
    description: "Rider collected laundry from customer door",
    actorRole: "rider",
    modes: ["door"],
  },
  {
    kind: "received_at_hub",
    label: "Received at hub",
    description: "Items arrived at processing hub",
    actorRole: "station",
    modes: ["door", "station"],
  },
  {
    kind: "washing_started",
    label: "Washing started",
    description: "Load entered the wash cycle",
    actorRole: "station",
    modes: ["door", "station"],
  },
  {
    kind: "washing_complete",
    label: "Washing complete",
    description: "Wash and dry finished",
    actorRole: "station",
    modes: ["door", "station"],
  },
  {
    kind: "ready_for_pickup",
    label: "Ready for pickup",
    description: "Customer can collect from station",
    actorRole: "station",
    modes: ["station"],
  },
  {
    kind: "out_for_delivery",
    label: "Out for delivery",
    description: "Rider delivering clean items to customer",
    actorRole: "rider",
    modes: ["door"],
  },
  {
    kind: "delivered_to_customer",
    label: "Delivered to customer",
    description: "Clean items handed to customer",
    actorRole: "rider",
    modes: ["door"],
  },
  {
    kind: "customer_collected",
    label: "Customer collected",
    description: "Customer picked up from station",
    actorRole: "customer",
    modes: ["station"],
  },
  {
    kind: "mamafua_dispatched",
    label: "Mama Fua dispatched",
    description: "Rider left with Mama Fua and equipment",
    actorRole: "rider",
    modes: ["mamafua"],
  },
  {
    kind: "mamafua_arrived",
    label: "Mama Fua arrived",
    description: "Team arrived at customer location",
    actorRole: "rider",
    modes: ["mamafua"],
  },
  {
    kind: "cleaning_started",
    label: "Cleaning started",
    description: "On-site cleaning in progress",
    actorRole: "rider",
    modes: ["mamafua"],
  },
  {
    kind: "cleaning_complete",
    label: "Cleaning complete",
    description: "All selected tasks finished",
    actorRole: "rider",
    modes: ["mamafua"],
  },
  {
    kind: "visit_completed",
    label: "Visit completed",
    description: "Mama Fua visit closed",
    actorRole: "admin",
    modes: ["mamafua"],
  },
  {
    kind: "note",
    label: "Ops note",
    description: "Internal note on the order",
    actorRole: "admin",
    modes: [],
  },
];

const byKind = new Map(LAUNDRY_TRACKING_EVENTS.map((e) => [e.kind, e]));

export function getTrackingEventDef(kind: laundry_event_kind) {
  return byKind.get(kind);
}

export function trackingEventsForMode(pickupMode: string): TrackingEventDef[] {
  return LAUNDRY_TRACKING_EVENTS.filter(
    (e) => e.modes.length === 0 || e.modes.includes(pickupMode as never),
  );
}

/** Roles allowed to log events via API (MVP: admin logs all; agent as rider/station proxy) */
export const ACTOR_FOR_USER_ROLE: Record<string, laundry_actor_role> = {
  admin: "admin",
  agent: "rider",
  user: "customer",
};

/** Suggested coarse status when admin logs a granular checkpoint. */
export function statusForTrackingKind(
  kind: laundry_event_kind,
  pickupMode: string,
): laundry_status | null {
  const door: Partial<Record<laundry_event_kind, laundry_status>> = {
    rider_assigned: "pickup_scheduled",
    rider_en_route: "pickup_scheduled",
    items_picked_up: "collected",
    received_at_hub: "processing",
    washing_started: "processing",
    washing_complete: "ready",
    out_for_delivery: "ready",
    delivered_to_customer: "delivered",
  };
  const station: Partial<Record<laundry_event_kind, laundry_status>> = {
    customer_dropped_at_station: "collected",
    items_received_at_station: "collected",
    washing_started: "processing",
    washing_complete: "ready",
    ready_for_pickup: "ready",
    customer_collected: "delivered",
  };
  const mamafua: Partial<Record<laundry_event_kind, laundry_status>> = {
    mamafua_dispatched: "pickup_scheduled",
    mamafua_arrived: "collected",
    cleaning_started: "processing",
    cleaning_complete: "ready",
    visit_completed: "delivered",
  };

  if (pickupMode === "station") return station[kind] ?? null;
  if (pickupMode === "mamafua") return mamafua[kind] ?? null;
  return door[kind] ?? null;
}
