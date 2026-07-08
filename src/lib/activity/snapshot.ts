import { prisma } from "@/lib/db";

export type ActivitySnapshot =
  | {
      scope: "admin";
      requestedCount: number;
      awaitingUserMessages: number;
      latestAt: number;
    }
  | {
      scope: "user";
      activeRequests: number;
      opsMessages: number;
      activeLaundry: number;
      activeStays: number;
      latestAt: number;
    };

function maxTimestamp(...values: Array<string | Date | null | undefined>): number {
  return Math.max(
    ...values.map((value) => {
      if (!value) return 0;
      const parsed = Date.parse(String(value));
      return Number.isFinite(parsed) ? parsed : 0;
    }),
    0,
  );
}

export async function fetchActivitySnapshot(
  userId: string,
  role: "user" | "agent" | "admin",
): Promise<ActivitySnapshot> {
  if (role === "admin") {
    const [requests, userMsgs, laundry] = await Promise.all([
      prisma.$queryRaw<{ requested: number; latest: Date }[]>`
        SELECT COUNT(*)::int AS requested, COALESCE(MAX(updated_at), NOW()) AS latest
        FROM listing_requests WHERE status = 'requested'
      `,
      prisma.$queryRaw<{ awaiting: number; latest: Date }[]>`
        SELECT COUNT(*)::int AS awaiting, COALESCE(MAX(m.created_at), NOW()) AS latest
        FROM listing_request_messages m
        JOIN listing_requests r ON r.id = m.request_id
        WHERE m.sender_role = 'user'
      `,
      prisma.$queryRaw<{ latest: Date }[]>`
        SELECT COALESCE(MAX(updated_at), NOW()) AS latest FROM laundry_orders
      `,
    ]);

    return {
      scope: "admin",
      requestedCount: requests[0]?.requested ?? 0,
      awaitingUserMessages: userMsgs[0]?.awaiting ?? 0,
      latestAt: maxTimestamp(
        requests[0]?.latest,
        userMsgs[0]?.latest,
        laundry[0]?.latest,
      ),
    };
  }

  const [reqs, msgs, laundry, bookings] = await Promise.all([
    prisma.$queryRaw<{ active: number; latest: Date }[]>`
      SELECT COUNT(*)::int AS active, COALESCE(MAX(updated_at), NOW()) AS latest
      FROM listing_requests
      WHERE user_id = ${userId}::uuid
        AND status IN ('requested','agent_contacted','rider_assigned','rider_en_route')
    `,
    prisma.$queryRaw<{ ops: number; latest: Date }[]>`
      SELECT COUNT(*)::int AS ops, COALESCE(MAX(m.created_at), NOW()) AS latest
      FROM listing_request_messages m
      JOIN listing_requests r ON r.id = m.request_id
      WHERE r.user_id = ${userId}::uuid AND m.sender_role IN ('admin','system')
    `,
    prisma.$queryRaw<{ active: number; latest: Date }[]>`
      SELECT COUNT(*)::int AS active, COALESCE(MAX(updated_at), NOW()) AS latest
      FROM laundry_orders
      WHERE user_id = ${userId}::uuid AND status NOT IN ('delivered','cancelled')
    `,
    prisma.$queryRaw<{ active: number; latest: Date }[]>`
      SELECT COUNT(*)::int AS active, COALESCE(MAX(updated_at), NOW()) AS latest
      FROM bnb_bookings
      WHERE user_id = ${userId}::uuid AND status IN ('pending_payment','confirmed')
    `,
  ]);

  return {
    scope: "user",
    activeRequests: reqs[0]?.active ?? 0,
    opsMessages: msgs[0]?.ops ?? 0,
    activeLaundry: laundry[0]?.active ?? 0,
    activeStays: bookings[0]?.active ?? 0,
    latestAt: maxTimestamp(
      reqs[0]?.latest,
      msgs[0]?.latest,
      laundry[0]?.latest,
      bookings[0]?.latest,
    ),
  };
}
