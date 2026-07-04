import { prisma } from "@/lib/db";

export const userProfileSelect = {
  id: true,
  phoneE164: true,
  displayName: true,
  email: true,
  county: true,
  bio: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UserProfileRow = {
  id: string;
  phoneE164: string;
  displayName: string | null;
  email: string | null;
  county: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getUserActivityCounts(userId: string) {
  const [laundryOrders, bnbBookings, feedback] = await Promise.all([
    prisma.laundryOrder.count({ where: { userId } }),
    prisma.bnbBooking.count({ where: { userId } }),
    prisma.serviceFeedback.count({ where: { userId } }),
  ]);
  return { laundryOrders, bnbBookings, feedback };
}

export function toUserProfileDto(
  user: UserProfileRow,
  stats?: { laundryOrders: number; bnbBookings: number; feedback: number },
) {
  return {
    id: user.id,
    phone: user.phoneE164,
    displayName: user.displayName,
    email: user.email,
    county: user.county,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    signedUpAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    updatedAt: user.updatedAt.toISOString(),
    stats: stats ?? undefined,
  };
}

export function toAdminUserDto(user: UserProfileRow) {
  return {
    id: user.id,
    phone: user.phoneE164,
    displayName: user.displayName,
    email: user.email,
    county: user.county,
    role: user.role,
    isActive: user.isActive,
    signedUpAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
