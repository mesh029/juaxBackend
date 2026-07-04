import type { ServiceFeedback } from "@prisma/client";

type FeedbackRow = Pick<
  ServiceFeedback,
  | "id"
  | "service"
  | "category"
  | "rating"
  | "title"
  | "body"
  | "orderId"
  | "listingId"
  | "status"
  | "adminNotes"
  | "createdAt"
  | "updatedAt"
> & {
  user?: {
    id: string;
    phoneE164: string;
    displayName: string | null;
  } | null;
};

export const feedbackListSelect = {
  id: true,
  service: true,
  category: true,
  rating: true,
  title: true,
  body: true,
  orderId: true,
  listingId: true,
  status: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, phoneE164: true, displayName: true },
  },
} as const;

export function toFeedbackDto(row: FeedbackRow) {
  return {
    id: row.id,
    service: row.service,
    category: row.category,
    rating: row.rating,
    title: row.title,
    body: row.body,
    orderId: row.orderId,
    listingId: row.listingId,
    status: row.status,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: row.user
      ? {
          id: row.user.id,
          phone: row.user.phoneE164,
          displayName: row.user.displayName,
        }
      : null,
  };
}
