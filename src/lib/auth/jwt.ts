import { SignJWT, jwtVerify } from "jose";

export type JwtPayload = {
  sub: string;
  role: "user" | "agent" | "admin";
  phone: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ role: payload.role, phone: payload.phone })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer("jua-x")
    .setAudience("jua-x-app")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: "jua-x",
    audience: "jua-x-app",
  });

  const sub = payload.sub;
  const role = payload.role;
  const phone = payload.phone;

  if (
    typeof sub !== "string" ||
    (role !== "user" && role !== "agent" && role !== "admin") ||
    typeof phone !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return { sub, role, phone };
}
