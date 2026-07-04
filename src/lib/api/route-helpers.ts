import { Prisma } from "@prisma/client";
import { AuthError } from "@/lib/auth/require-auth";
import { jsonWithCors } from "@/lib/cors";
import { ZodError } from "zod";

function zodFieldErrors(err: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.errors) {
    const path = issue.path.length ? issue.path.join(".") : "_root";
    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

export function handleRouteError(request: Request, err: unknown) {
  if (err instanceof AuthError) {
    return jsonWithCors({ error: err.code, message: err.message }, request, {
      status: err.status,
    });
  }
  if (err instanceof ZodError) {
    const fieldErrors = zodFieldErrors(err);
    const first = err.errors[0];
    return jsonWithCors(
      {
        error: "validation_error",
        message: first?.message ?? "Invalid request",
        fieldErrors,
      },
      request,
      { status: 400 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2024") {
      return jsonWithCors(
        {
          error: "db_unavailable",
          message: "Database is busy — wait a moment and try again",
        },
        request,
        { status: 503 },
      );
    }
  }
  console.error(err);
  return jsonWithCors({ error: "server_error", message: "Internal error" }, request, {
    status: 500,
  });
}
