import type {
  listing_message_sender,
  listing_request_kind,
  listing_request_status,
  Listing,
  ListingRequest,
  ListingRequestMessage,
  User,
} from "@prisma/client";

export const LISTING_REQUEST_STEPS: listing_request_status[] = [
  "requested",
  "agent_contacted",
  "rider_assigned",
  "rider_en_route",
  "viewing_completed",
];

export const VIEWING_PICKUP_MODE_LABELS: Record<"taxi" | "rider", string> = {
  taxi: "Car / taxi pickup",
  rider: "Motorbike rider",
};

export const LISTING_REQUEST_STATUS_LABELS: Record<listing_request_status, string> = {
  requested: "Request submitted",
  agent_contacted: "Agent contacted you",
  rider_assigned: "Rider assigned",
  rider_en_route: "Rider on the way",
  viewing_completed: "Viewing complete",
  cancelled: "Cancelled",
};

export function listingRequestStepIndex(status: listing_request_status): number {
  if (status === "cancelled") return -1;
  const idx = LISTING_REQUEST_STEPS.indexOf(status);
  return idx >= 0 ? idx : 0;
}

type ListingRequestRow = ListingRequest & {
  listing?: Pick<Listing, "id" | "title" | "type" | "neighborhood" | "county"> | null;
  user?: Pick<User, "id" | "displayName" | "phoneE164" | "email"> | null;
  messages?: ListingRequestMessage[];
};

export function toListingRequestMessageDto(m: ListingRequestMessage) {
  return {
    id: m.id,
    senderRole: m.senderRole,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

export function toListingRequestDto(row: ListingRequestRow, opts?: { includeMessages?: boolean }) {
  const service = row.listing?.type === "bnb" ? "bnb" : "rental";
  return {
    id: row.id,
    listingId: row.listingId,
    listingTitle: row.listing?.title ?? "Listing",
    kind: row.kind as listing_request_kind,
    service,
    status: row.status,
    userNote: row.userNote,
    pickupMode: row.pickupMode,
    pickupModeLabel: row.pickupMode ? VIEWING_PICKUP_MODE_LABELS[row.pickupMode] : null,
    riderName: row.riderName,
    riderPhone: row.riderPhone,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    statusLabel: LISTING_REQUEST_STATUS_LABELS[row.status],
    stepIndex: listingRequestStepIndex(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    listing: row.listing
      ? {
          id: row.listing.id,
          title: row.listing.title,
          type: row.listing.type,
          neighborhood: row.listing.neighborhood,
          county: row.listing.county,
        }
      : null,
    user: row.user
      ? {
          id: row.user.id,
          displayName: row.user.displayName,
          phone: row.user.phoneE164,
          email: row.user.email,
        }
      : undefined,
    messages: opts?.includeMessages && row.messages ? row.messages.map(toListingRequestMessageDto) : undefined,
  };
}

export type ListingRequestDto = ReturnType<typeof toListingRequestDto>;
