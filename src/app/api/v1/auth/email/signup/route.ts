import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { OtpError, toUserDto } from "@/lib/auth/service";
import { signUpWithEmail } from "@/lib/auth/email-auth";

const bodySchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(80),
  county: z.string().max(40).optional(),
  phone: z.string().min(9).max(20).optional(),
});

/** Create account with email + password → JWT */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token, user, isNewUser } = await signUpWithEmail(body);
    return jsonWithCors(
      {
        token,
        user: toUserDto(user),
        isNewUser,
        flow: "email_signup",
      },
      request,
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof OtpError) {
      const status =
        err.code === "email_exists" || err.code === "phone_exists" ? 409 : 400;
      return jsonWithCors({ error: err.code, message: err.message }, request, { status });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
