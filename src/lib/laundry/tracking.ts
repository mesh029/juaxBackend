import { prisma } from "@/lib/db";
import type { laundry_actor_role, laundry_event_kind } from "@prisma/client";
import { getTrackingEventDef } from "@/lib/laundry/tracking-events";

export async function logLaundryTrackingEvent(opts: {
  orderId: string;
  kind: laundry_event_kind;
  actorRole: laundry_actor_role;
  createdBy?: string;
  note?: string;
}) {
  return prisma.laundryTrackingEvent.create({
    data: {
      orderId: opts.orderId,
      kind: opts.kind,
      actorRole: opts.actorRole,
      createdBy: opts.createdBy,
      note: opts.note,
    },
    include: {
      creator: { select: { displayName: true, phoneE164: true, role: true } },
    },
  });
}

export function toTrackingEventDto(event: {
  id: string;
  kind: laundry_event_kind;
  actorRole: laundry_actor_role;
  note: string | null;
  createdAt: Date;
  creator?: { displayName: string | null; phoneE164: string; role: string } | null;
}) {
  const def = getTrackingEventDef(event.kind);
  return {
    id: event.id,
    kind: event.kind,
    label: def?.label ?? event.kind,
    description: def?.description,
    actorRole: event.actorRole,
    note: event.note,
    createdAt: event.createdAt.toISOString(),
    createdBy: event.creator
      ? {
          name: event.creator.displayName,
          phone: event.creator.phoneE164,
          role: event.creator.role,
        }
      : null,
  };
}

export const trackingInclude = {
  tracking: {
    orderBy: { createdAt: "asc" as const },
    include: {
      creator: { select: { displayName: true, phoneE164: true, role: true } },
    },
  },
};
