import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtPayload } from "@/lib/auth/jwt";
import { getUserById, type AuthUser } from "@/lib/auth/service";

export async function getBearerToken(request: NextRequest | Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export async function optionalAuth(
  request: NextRequest | Request,
): Promise<{ user: AuthUser; claims: JwtPayload } | null> {
  const token = await getBearerToken(request);
  if (!token) return null;

  try {
    const claims = await verifyAccessToken(token);
    const user = await getUserById(claims.sub);
    if (!user) return null;
    return { user, claims };
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest | Request,
): Promise<{ user: AuthUser; claims: JwtPayload }> {
  const token = await getBearerToken(request);
  if (!token) {
    throw new AuthError("unauthorized", "Missing or invalid token", 401);
  }

  let claims: JwtPayload;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    throw new AuthError("unauthorized", "Missing or invalid token", 401);
  }

  const user = await getUserById(claims.sub);
  if (!user) {
    throw new AuthError("unauthorized", "User not found", 401);
  }

  return { user, claims };
}

export async function requireRole(
  request: NextRequest | Request,
  roles: Array<AuthUser["role"]>,
): Promise<{ user: AuthUser; claims: JwtPayload }> {
  const ctx = await requireAuth(request);
  if (!roles.includes(ctx.user.role)) {
    throw new AuthError("forbidden", "Insufficient permissions", 403);
  }
  return ctx;
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
