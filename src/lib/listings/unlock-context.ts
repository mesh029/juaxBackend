import { prisma } from "@/lib/db";
import type { UnlockContext } from "@/lib/location-gate";

const EMPTY_CTX: UnlockContext = {
  userId: null,
  hasActiveRentalSubscription: false,
  confirmedBnbListingIds: new Set(),
};

export async function buildUnlockContext(userId: string | null): Promise<UnlockContext> {
  if (!userId) return EMPTY_CTX;

  const [activeSub, bookings] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        userId,
        paymentStatus: "success",
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    }),
    prisma.bnbBooking.findMany({
      where: {
        userId,
        status: "confirmed",
        paymentStatus: "success",
      },
      select: { listingId: true },
    }),
  ]);

  return {
    userId,
    hasActiveRentalSubscription: !!activeSub,
    confirmedBnbListingIds: new Set(bookings.map((b) => b.listingId)),
  };
}
