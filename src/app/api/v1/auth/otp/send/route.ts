import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { OtpError, sendOtp } from "@/lib/auth/service";
import { otpSendPayload } from "@/lib/auth/otp-response";

const bodySchema = z.object({
  phone: z.string().min(9).max(20),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await sendOtp(body.phone);

    return jsonWithCors(otpSendPayload("otp", result.devCode), request);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonWithCors({ error: "validation_error", message: err.message }, request, {
        status: 400,
      });
    }
    if (err instanceof OtpError) {
      const status = err.code === "rate_limited" ? 429 : 400;
      return jsonWithCors({ error: err.code, message: err.message }, request, { status });
    }
    console.error(err);
    return jsonWithCors({ error: "server_error", message: "Internal error" }, request, {
      status: 500,
    });
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
