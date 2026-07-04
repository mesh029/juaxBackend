import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { OtpError, toUserDto, updateUserProfile, verifyOtp } from "@/lib/auth/service";

const bodySchema = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(6),
  name: z.string().min(2).max(80),
  county: z.string().max(40).optional(),
});

/** Sign up — step 2: verify OTP, name required for new accounts */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token, user, isNewUser } = await verifyOtp(body.phone, body.code, body.name, {
      requireName: true,
      rejectExisting: true,
    });

    if (body.county?.trim() && isNewUser) {
      const updated = await updateUserProfile(user.id, { county: body.county.trim() });
      return jsonWithCors(
        {
          token,
          user: toUserDto(updated),
          isNewUser,
          flow: "signup",
        },
        request,
        { status: isNewUser ? 201 : 200 },
      );
    }

    return jsonWithCors(
      {
        token,
        user: toUserDto(user),
        isNewUser,
        flow: "signup",
      },
      request,
      { status: isNewUser ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof OtpError) {
      const status = err.code === "account_exists" ? 409 : 400;
      return jsonWithCors({ error: err.code, message: err.message }, request, { status });
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
