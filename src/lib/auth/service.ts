import { prisma } from "@/lib/db";
import {
  OTP_SEND_LIMIT,
  OTP_SEND_WINDOW_MS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from "@/lib/auth/otp-crypto";
import { normalizeKenyaPhone } from "@/lib/auth/phone";
import { signAccessToken } from "@/lib/auth/jwt";
import type { user_role } from "@prisma/client";
import { userProfileSelect } from "@/lib/users/profile";
import { devAccountForRole, type DevLoginRole } from "@/lib/auth/dev-accounts";
import { isDevLoginEnabled } from "@/lib/auth/otp-response";

export type AuthUser = {
  id: string;
  phone_e164: string;
  display_name: string | null;
  email: string | null;
  county: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: user_role;
  created_at: Date;
  last_login_at: Date | null;
};

export async function isPhoneRegistered(rawPhone: string): Promise<boolean> {
  const phone = normalizeKenyaPhone(rawPhone);
  if (!phone) return false;
  const user = await prisma.user.findUnique({
    where: { phoneE164: phone },
    select: { id: true },
  });
  return !!user;
}

export async function sendOtp(rawPhone: string): Promise<{ devCode?: string }> {
  const phone = normalizeKenyaPhone(rawPhone);
  if (!phone) {
    throw new OtpError("invalid_phone", "Use a valid +254 mobile number");
  }

  const since = new Date(Date.now() - OTP_SEND_WINDOW_MS);
  const recent = await prisma.otpSession.count({
    where: { phoneE164: phone, createdAt: { gt: since } },
  });

  if (recent >= OTP_SEND_LIMIT) {
    throw new OtpError("rate_limited", "Too many OTP requests. Try again later.");
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpSession.create({
    data: {
      phoneE164: phone,
      codeHash: hashOtpCode(code),
      expiresAt,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP] ${phone} → ${code}`);
    return { devCode: code };
  }

  return {};
}

export type VerifyOtpOptions = {
  /** Sign up — name required when creating a new account */
  requireName?: boolean;
  /** Sign in — reject phones with no existing account */
  existingOnly?: boolean;
  /** Sign up — reject phones that already have an account */
  rejectExisting?: boolean;
};

export async function verifyOtp(
  rawPhone: string,
  code: string,
  displayName?: string,
  opts?: VerifyOtpOptions,
): Promise<{ token: string; user: AuthUser; isNewUser: boolean }> {
  const phone = normalizeKenyaPhone(rawPhone);
  if (!phone) {
    throw new OtpError("invalid_phone", "Use a valid +254 mobile number");
  }

  if (!/^\d{6}$/.test(code)) {
    throw new OtpError("invalid_code", "OTP must be 6 digits");
  }

  const session = await prisma.otpSession.findFirst({
    where: { phoneE164: phone },
    orderBy: { createdAt: "desc" },
  });

  if (!session || session.consumedAt) {
    throw new OtpError("invalid_code", "Invalid or expired OTP");
  }

  if (session.expiresAt < new Date()) {
    throw new OtpError("invalid_code", "Invalid or expired OTP");
  }

  if (!verifyOtpCode(code, session.codeHash)) {
    throw new OtpError("invalid_code", "Invalid or expired OTP");
  }

  await prisma.otpSession.update({
    where: { id: session.id },
    data: { consumedAt: new Date() },
  });

  const existing = await prisma.user.findUnique({
    where: { phoneE164: phone },
    select: { id: true },
  });
  const isNewUser = !existing;

  if (opts?.existingOnly && isNewUser) {
    throw new OtpError(
      "account_not_found",
      "No account for this number. Sign up first or check the phone you entered.",
    );
  }

  if (opts?.rejectExisting && !isNewUser) {
    throw new OtpError(
      "account_exists",
      "This number is already registered. Sign in instead.",
    );
  }

  if (opts?.requireName && isNewUser && !displayName?.trim()) {
    throw new OtpError("name_required", "Display name is required for sign up");
  }

  const user = await findOrCreateUser(phone, displayName, isNewUser);
  const token = await signAccessToken({
    sub: user.id,
    role: user.role,
    phone: user.phone_e164,
  });

  return { token, user, isNewUser };
}

async function findOrCreateUser(
  phone: string,
  displayName?: string,
  isNewUser = false,
): Promise<AuthUser> {
  const now = new Date();
  const existing = await prisma.user.findUnique({
    where: { phoneE164: phone },
    select: userProfileSelect,
  });

  if (existing) {
    const data: { displayName?: string; lastLoginAt: Date } = { lastLoginAt: now };
    if (displayName?.trim()) data.displayName = displayName.trim();
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data,
      select: userProfileSelect,
    });
    return toAuthUser(updated);
  }

  if (!isNewUser) {
    throw new OtpError("account_not_found", "Account not found");
  }

  const created = await prisma.user.create({
    data: {
      phoneE164: phone,
      displayName: displayName?.trim() || null,
      lastLoginAt: now,
    },
    select: userProfileSelect,
  });

  return toAuthUser(created);
}

export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    email?: string | null;
    county?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
  },
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName.trim() || null }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.county !== undefined && { county: data.county?.trim() || null }),
      ...(data.bio !== undefined && { bio: data.bio?.trim() || null }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl?.trim() || null }),
    },
    select: userProfileSelect,
  });
  return toAuthUser(updated);
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({
    where: { id, isActive: true },
    select: userProfileSelect,
  });
  return user ? toAuthUser(user) : null;
}

/** One-click sign-in for seeded dev accounts (disabled when OTP_DEV_MODE is off). */
export async function devLoginByRole(
  role: DevLoginRole,
): Promise<{ token: string; user: AuthUser }> {
  if (!isDevLoginEnabled()) {
    throw new OtpError(
      "forbidden",
      "Dev login is off. Set OTP_DEV_MODE=true or DEV_LOGIN_ENABLED=true on Vercel.",
    );
  }

  const account = devAccountForRole(role);
  if (!account) {
    throw new OtpError("invalid_role", "Unknown dev role");
  }

  const existing = await prisma.user.findUnique({
    where: { phoneE164: account.phone },
    select: userProfileSelect,
  });

  if (!existing) {
    throw new OtpError(
      "account_not_found",
      `No seeded user for ${account.label}. Run npm run seed.`,
    );
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: { lastLoginAt: new Date() },
    select: userProfileSelect,
  });

  const authUser = toAuthUser(user);
  const token = await signAccessToken({
    sub: authUser.id,
    role: authUser.role,
    phone: authUser.phone_e164,
  });

  return { token, user: authUser };
}

function toAuthUser(user: {
  id: string;
  phoneE164: string;
  displayName: string | null;
  email: string | null;
  county: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: user_role;
  createdAt: Date;
  lastLoginAt: Date | null;
}): AuthUser {
  return {
    id: user.id,
    phone_e164: user.phoneE164,
    display_name: user.displayName,
    email: user.email,
    county: user.county,
    bio: user.bio,
    avatar_url: user.avatarUrl,
    role: user.role,
    created_at: user.createdAt,
    last_login_at: user.lastLoginAt,
  };
}

export class OtpError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "OtpError";
  }
}

export function toUserDto(user: AuthUser) {
  return {
    id: user.id,
    phone: user.phone_e164,
    displayName: user.display_name,
    email: user.email,
    county: user.county,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    role: user.role,
    signedUpAt: user.created_at.toISOString(),
    lastLoginAt: user.last_login_at?.toISOString() ?? null,
  };
}
