import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { OtpError, toUserDto } from "@/lib/auth/service";
import { signInWithEmail } from "@/lib/auth/email-auth";

const bodySchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(128),
});

/** Sign in with email + password → JWT */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token, user } = await signInWithEmail(body.email, body.password);
    return jsonWithCors(
      {
        token,
        user: toUserDto(user),
        flow: "email_signin",
      },
      request,
    );
  } catch (err) {
    if (err instanceof OtpError) {
      const status = err.code === "invalid_credentials" ? 401 : 400;
      return jsonWithCors({ error: err.code, message: err.message }, request, { status });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
