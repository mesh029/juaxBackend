import { z } from "zod";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { OtpError, toUserDto, verifyOtp } from "@/lib/auth/service";

const bodySchema = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(6),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token, user, isNewUser } = await verifyOtp(body.phone, body.code, body.name);

    return jsonWithCors(
      {
        token,
        user: toUserDto(user),
        isNewUser,
      },
      request,
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonWithCors({ error: "validation_error", message: err.message }, request, {
        status: 400,
      });
    }
    if (err instanceof OtpError) {
      return jsonWithCors({ error: err.code, message: err.message }, request, { status: 401 });
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
