import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { OtpError, sendOtp } from "@/lib/auth/service";

const bodySchema = z.object({
  phone: z.string().min(9).max(20),
});

/** Sign in — step 1: send OTP to existing or new phone */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await sendOtp(body.phone);
    return jsonWithCors(
      {
        ok: true,
        message: "OTP sent",
        flow: "signin",
        ...(result.devCode ? { devCode: result.devCode } : {}),
      },
      request,
    );
  } catch (err) {
    if (err instanceof OtpError) {
      const status = err.code === "rate_limited" ? 429 : 400;
      return jsonWithCors({ error: err.code, message: err.message }, request, { status });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
