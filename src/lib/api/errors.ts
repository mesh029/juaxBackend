export type ApiErrorPayload = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  readonly isNetwork: boolean;

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    fieldErrors?: Record<string, string>;
    isNetwork?: boolean;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.fieldErrors = opts.fieldErrors ?? {};
    this.isNetwork = opts.isNetwork ?? false;
  }

  static fromPayload(payload: ApiErrorPayload, status: number): ApiError {
    return new ApiError({
      code: payload.error ?? "request_failed",
      message: payload.message ?? `Request failed (${status})`,
      status,
      fieldErrors: payload.fieldErrors,
    });
  }

  static network(message = "Network error — check your connection and try again"): ApiError {
    return new ApiError({
      code: "network_error",
      message,
      status: 0,
      isNetwork: true,
    });
  }

  /** User-friendly headline for toasts */
  headline(): string {
    if (this.isNetwork) return "Connection problem";
    if (this.code === "validation_error") return "Fix form errors";
    if (this.code === "unauthorized") return "Sign in required";
    if (this.code === "forbidden") return "Not allowed";
    if (this.code === "db_unavailable") return "Database busy";
    return "Something went wrong";
  }
}

/** Map Zod/API field paths to form field keys */
export function mapListingFieldErrors(
  fieldErrors: Record<string, string>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    const key = path.replace(/\./g, "_");
    map[key] = message;
  }
  return map;
}
