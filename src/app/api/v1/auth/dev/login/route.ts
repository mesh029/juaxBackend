import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { DEV_LOGIN_ROLES } from "@/lib/auth/dev-accounts";
import { OtpError, devLoginByRole, toUserDto } from "@/lib/auth/service";

const bodySchema = z.object({
  role: z.enum(DEV_LOGIN_ROLES),
});

/** Dev-only: sign in as admin / agent / user with one click (no OTP). */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token, user } = await devLoginByRole(body.role);
    return jsonWithCors(
      {
        token,
        user: toUserDto(user),
        flow: "dev",
        message: "Dev login — replace with OTP when SMS is live",
      },
      request,
    );
  } catch (err) {
    if (err instanceof OtpError) {
      const status = err.code === "forbidden" ? 403 : 400;
      return jsonWithCors({ error: err.code, message: err.message }, request, { status });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
