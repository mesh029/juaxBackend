import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { OtpError, toUserDto, verifyOtp } from "@/lib/auth/service";

const bodySchema = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(6),
  name: z.string().max(80).optional(),
});

/** Sign in — step 2: verify OTP and receive JWT */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token, user, isNewUser } = await verifyOtp(body.phone, body.code, body.name, {
      existingOnly: true,
    });
    return jsonWithCors(
      {
        token,
        user: toUserDto(user),
        isNewUser,
        flow: "signin",
      },
      request,
    );
  } catch (err) {
    if (err instanceof OtpError) {
      const status =
        err.code === "account_not_found" ? 404 : err.code === "rate_limited" ? 429 : 400;
      return jsonWithCors({ error: err.code, message: err.message }, request, { status });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
