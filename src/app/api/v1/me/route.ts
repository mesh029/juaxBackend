import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { AuthError, requireAuth } from "@/lib/auth/require-auth";
import { toUserDto } from "@/lib/auth/service";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth(request);
    return jsonWithCors({ user: toUserDto(user) }, request);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonWithCors({ error: err.code, message: err.message }, request, {
        status: err.status,
      });
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
