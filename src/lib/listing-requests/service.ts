import type { listing_message_sender, listing_request_status } from "@prisma/client";
import { prisma } from "@/lib/db";

const listingSelect = {
  id: true,
  title: true,
  type: true,
  neighborhood: true,
  county: true,
} as const;

const userSelect = {
  id: true,
  displayName: true,
  phoneE164: true,
  email: true,
} as const;

const PICKUP_LABELS: Record<"taxi" | "rider", string> = {
  taxi: "car / taxi",
  rider: "motorbike rider",
};

export async function createListingRequest(input: {
  userId: string;
  listingId: string;
  kind: "viewing" | "tour" | "stay";
  userNote?: string;
  pickupMode?: "taxi" | "rider";
}) {
  const listing = await prisma.listing.findFirst({
    where: { id: input.listingId, status: "published" },
    select: { id: true, type: true, title: true },
  });
  if (!listing) return null;

  if (input.kind === "viewing" && listing.type !== "rental") return null;
  if (input.kind === "tour" && listing.type !== "bnb") return null;

  const pickupNote =
    input.kind === "viewing" && input.pickupMode
      ? ` Pickup preference: ${PICKUP_LABELS[input.pickupMode]}.`
      : "";

  const row = await prisma.listingRequest.create({
    data: {
      userId: input.userId,
      listingId: input.listingId,
      kind: input.kind,
      userNote: input.userNote?.trim() || null,
      pickupMode: input.kind === "viewing" ? input.pickupMode ?? null : null,
      messages: {
        create: {
          senderRole: "system",
          body: `${input.kind === "viewing" ? "Viewing" : input.kind === "tour" ? "Tour" : "Stay"} request submitted for "${listing.title}".${pickupNote} Our team will follow up shortly.`,
        },
      },
    },
    include: {
      listing: { select: listingSelect },
      user: { select: userSelect },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return row;
}

export async function listUserListingRequests(userId: string) {
  return prisma.listingRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: listingSelect },
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
}

export async function getUserListingRequest(userId: string, id: string) {
  return prisma.listingRequest.findFirst({
    where: { id, userId },
    include: {
      listing: { select: listingSelect },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listAdminListingRequests(filters?: {
  status?: listing_request_status;
  kind?: "viewing" | "tour" | "stay";
}) {
  return prisma.listingRequest.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.kind ? { kind: filters.kind } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: listingSelect },
      user: { select: userSelect },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getAdminListingRequest(id: string) {
  return prisma.listingRequest.findUnique({
    where: { id },
    include: {
      listing: { select: listingSelect },
      user: { select: userSelect },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function updateListingRequest(
  id: string,
  data: {
    status?: listing_request_status;
    riderName?: string | null;
    riderPhone?: string | null;
    scheduledAt?: Date | null;
  },
) {
  return prisma.listingRequest.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.riderName !== undefined ? { riderName: data.riderName } : {}),
      ...(data.riderPhone !== undefined ? { riderPhone: data.riderPhone } : {}),
      ...(data.scheduledAt !== undefined ? { scheduledAt: data.scheduledAt } : {}),
    },
    include: {
      listing: { select: listingSelect },
      user: { select: userSelect },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function addListingRequestMessage(input: {
  requestId: string;
  senderRole: listing_message_sender;
  body: string;
  createdBy?: string;
  advanceStatus?: listing_request_status;
}) {
  if (input.advanceStatus) {
    await prisma.listingRequest.update({
      where: { id: input.requestId },
      data: { status: input.advanceStatus },
    });
  }

  return prisma.listingRequestMessage.create({
    data: {
      requestId: input.requestId,
      senderRole: input.senderRole,
      body: input.body.trim(),
      createdBy: input.createdBy ?? null,
    },
  });
}
