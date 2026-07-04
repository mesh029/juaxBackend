import { prisma } from "@/lib/db";
import { signAccessToken } from "@/lib/auth/jwt";
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword } from "@/lib/auth/password";
import { normalizeKenyaPhone } from "@/lib/auth/phone";
import { userProfileSelect } from "@/lib/users/profile";
import {
  AuthUser,
  OtpError,
  issueSessionForUser,
  toAuthUser,
} from "@/lib/auth/service";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function uniquePlaceholderPhone(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const suffix = String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0");
    const phone = `+2547${suffix}`;
    const taken = await prisma.user.findUnique({ where: { phoneE164: phone }, select: { id: true } });
    if (!taken) return phone;
  }
  throw new OtpError("server_error", "Could not allocate phone for account");
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  name: string;
  county?: string;
  phone?: string;
}): Promise<{ token: string; user: AuthUser; isNewUser: true }> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) {
    throw new OtpError("invalid_email", "Enter a valid email address");
  }
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    throw new OtpError(
      "weak_password",
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }
  if (!input.name.trim()) {
    throw new OtpError("name_required", "Display name is required");
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    throw new OtpError("email_exists", "An account with this email already exists. Sign in instead.");
  }

  let phoneE164: string;
  if (input.phone?.trim()) {
    const normalized = normalizeKenyaPhone(input.phone);
    if (!normalized) throw new OtpError("invalid_phone", "Use a valid +254 mobile number");
    const phoneTaken = await prisma.user.findUnique({
      where: { phoneE164: normalized },
      select: { id: true },
    });
    if (phoneTaken) throw new OtpError("phone_exists", "This phone number is already registered");
    phoneE164 = normalized;
  } else {
    phoneE164 = await uniquePlaceholderPhone();
  }

  const now = new Date();
  const created = await prisma.user.create({
    data: {
      phoneE164,
      email,
      displayName: input.name.trim(),
      county: input.county?.trim() || null,
      passwordHash: hashPassword(input.password),
      lastLoginAt: now,
    },
    select: userProfileSelect,
  });

  const user = toAuthUser(created);
  const token = await issueSessionForUser(user);
  return { token, user, isNewUser: true };
}

export async function signInWithEmail(
  emailRaw: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const email = normalizeEmail(emailRaw);
  if (!email || !password) {
    throw new OtpError("invalid_credentials", "Invalid email or password");
  }

  const row = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    select: { ...userProfileSelect, passwordHash: true },
  });

  if (!row?.passwordHash || !verifyPassword(password, row.passwordHash)) {
    throw new OtpError("invalid_credentials", "Invalid email or password");
  }

  const updated = await prisma.user.update({
    where: { id: row.id },
    data: { lastLoginAt: new Date() },
    select: userProfileSelect,
  });

  const user = toAuthUser(updated);
  const token = await issueSessionForUser(user);
  return { token, user };
}
