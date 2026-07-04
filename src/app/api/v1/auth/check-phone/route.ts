import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { isPhoneRegistered, OtpError } from "@/lib/auth/service";
import { isOtpDevMode } from "@/lib/auth/otp-response";
import { normalizeKenyaPhone } from "@/lib/auth/phone";

/** Check whether a phone number already has an account (helps UI pick sign-in vs sign-up). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get("phone");
    if (!raw) {
      return jsonWithCors({ error: "validation_error", message: "phone query required" }, request, {
        status: 400,
      });
    }
    const phone = normalizeKenyaPhone(raw);
    if (!phone) {
      return jsonWithCors({ error: "invalid_phone", message: "Use a valid +254 mobile number" }, request, {
        status: 400,
      });
    }
    const registered = await isPhoneRegistered(raw);
    return jsonWithCors(
      {
        phone,
        registered,
        suggestedFlow: registered ? "signin" : "signup",
        devMode: isOtpDevMode(),
      },
      request,
    );
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
