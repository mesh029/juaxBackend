import type {
  AdminListing,
  AdminUser,
  ApiUser,
  AppCatalogBootstrap,
  HealthResponse,
  LaundryOrder,
  LaundryStation,
  NearbyResponse,
  PublicListing,
  ServiceFeedback,
  ServicesResponse,
  SubscriptionPlan,
  UserProfile,
} from "./types";
import { ApiError, type ApiErrorPayload } from "./errors";

const TOKEN_KEY = "juax_token";
const USER_KEY = "juax_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: ApiUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

type FetchOpts = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = opts.token ?? getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw ApiError.network();
  }

  const data = (await res.json().catch(() => ({}))) as ApiErrorPayload;
  if (!res.ok) {
    throw ApiError.fromPayload(data, res.status);
  }
  return data as T;
}

export const api = {
  health: () => apiFetch<HealthResponse>("/api/health"),
  /** One round-trip for mobile/web cold start — prefer over fan-out. See docs/CONNECTION_BUDGET.md */
  catalogBootstrap: (county = "kisumu") =>
    apiFetch<AppCatalogBootstrap>(`/api/v1/catalog/bootstrap?county=${encodeURIComponent(county)}`),
  services: () => apiFetch<ServicesResponse>("/api/v1/services"),
  listings: (params?: { type?: string; county?: string }) => {
    const q = new URLSearchParams({ county: params?.county ?? "kisumu" });
    if (params?.type) q.set("type", params.type);
    return apiFetch<PublicListing[]>(`/api/v1/listings?${q}`);
  },
  listing: (id: string) => apiFetch<PublicListing>(`/api/v1/listings/${id}`),
  nearby: (lat: number, lng: number, radiusKm = 5, type?: string) => {
    const q = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radiusKm: String(radiusKm),
    });
    if (type) q.set("type", type);
    return apiFetch<NearbyResponse>(`/api/v1/listings/nearby?${q}`);
  },
  laundryStations: () => apiFetch<LaundryStation[]>("/api/v1/laundry/stations"),
  subscriptionPlans: () =>
    apiFetch<{ plans: SubscriptionPlan[] }>("/api/v1/subscriptions/plans"),
  sendOtp: (phone: string) =>
    apiFetch<{ ok: boolean; devCode?: string }>("/api/v1/auth/otp/send", {
      method: "POST",
      body: { phone },
      token: null,
    }),
  verifyOtp: (phone: string, code: string, name?: string) =>
    apiFetch<{ token: string; user: ApiUser; isNewUser?: boolean }>("/api/v1/auth/otp/verify", {
      method: "POST",
      body: { phone, code, name },
      token: null,
    }),
  signInSend: (phone: string) =>
    apiFetch<{ ok: boolean; devCode?: string; devMode?: boolean; otpDisplayHint?: string }>(
      "/api/v1/auth/signin/send",
      {
        method: "POST",
        body: { phone },
        token: null,
      },
    ),
  signInVerify: (phone: string, code: string, name?: string) =>
    apiFetch<{ token: string; user: ApiUser; isNewUser: boolean }>("/api/v1/auth/signin/verify", {
      method: "POST",
      body: { phone, code, name },
      token: null,
    }),
  signUpSend: (phone: string) =>
    apiFetch<{ ok: boolean; devCode?: string; devMode?: boolean; otpDisplayHint?: string }>(
      "/api/v1/auth/signup/send",
      {
        method: "POST",
        body: { phone },
        token: null,
      },
    ),
  checkPhone: (phone: string) =>
    apiFetch<{ phone: string; registered: boolean; suggestedFlow: "signin" | "signup"; devMode: boolean }>(
      `/api/v1/auth/check-phone?phone=${encodeURIComponent(phone)}`,
      { token: null },
    ),
  signUpVerify: (phone: string, code: string, name: string, county?: string) =>
    apiFetch<{ token: string; user: ApiUser; isNewUser: boolean }>("/api/v1/auth/signup/verify", {
      method: "POST",
      body: { phone, code, name, county },
      token: null,
    }),
  devLogin: (role: "admin" | "agent" | "user") =>
    apiFetch<{ token: string; user: ApiUser }>("/api/v1/auth/dev/login", {
      method: "POST",
      body: { role },
      token: null,
    }),
  emailSignUp: (body: {
    email: string;
    password: string;
    name: string;
    county?: string;
    phone?: string;
  }) =>
    apiFetch<{ token: string; user: ApiUser; isNewUser: boolean }>(
      "/api/v1/auth/email/signup",
      { method: "POST", body, token: null },
    ),
  emailSignIn: (email: string, password: string) =>
    apiFetch<{ token: string; user: ApiUser }>("/api/v1/auth/email/signin", {
      method: "POST",
      body: { email, password },
      token: null,
    }),
  meProfile: () => apiFetch<{ user: UserProfile }>("/api/v1/me/profile"),
  updateProfile: (body: Record<string, unknown>) =>
    apiFetch<{ user: ApiUser }>("/api/v1/me/profile", { method: "PATCH", body }),
  submitFeedback: (body: Record<string, unknown>) =>
    apiFetch<{ feedback: ServiceFeedback }>("/api/v1/feedback", { method: "POST", body }),
  adminFeedback: (params?: { status?: string; service?: string; category?: string; listingRequests?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.service) q.set("service", params.service);
    if (params?.category) q.set("category", params.category);
    if (params?.listingRequests) q.set("listingRequests", "true");
    const qs = q.toString();
    return apiFetch<{ feedback: ServiceFeedback[]; summary: { newCount: number; avgRating: number | null } }>(
      `/api/v1/admin/feedback${qs ? `?${qs}` : ""}`,
    );
  },
  adminListingRequests: (params?: { status?: string; kind?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.kind) q.set("kind", params.kind);
    const qs = q.toString();
    return apiFetch<{ requests: import("./types").ListingRequestRecord[] }>(
      `/api/v1/admin/listing-requests${qs ? `?${qs}` : ""}`,
    );
  },
  adminListingRequest: (id: string) =>
    apiFetch<{ request: import("./types").ListingRequestRecord }>(`/api/v1/admin/listing-requests/${id}`),
  updateListingRequest: (id: string, body: Record<string, unknown>) =>
    apiFetch<{ request: import("./types").ListingRequestRecord }>(`/api/v1/admin/listing-requests/${id}`, {
      method: "PATCH",
      body,
    }),
  sendListingRequestMessage: (id: string, body: { body: string }) =>
    apiFetch<{ request: import("./types").ListingRequestRecord; message: import("./types").ListingRequestMessage }>(
      `/api/v1/admin/listing-requests/${id}/messages`,
      { method: "POST", body },
    ),
  adminSubscriptions: (plan?: string) => {
    const q = plan ? `?plan=${plan}` : "";
    return apiFetch<{
      subscriptions: Array<{
        id: string;
        plan: string;
        priceKes: number;
        paymentStatus: string;
        active: boolean;
        mpesaReceipt: string | null;
        startsAt: string;
        expiresAt: string;
        createdAt: string;
        eligibility: { plan: string; label: string; unlocks: string[] };
        customer: { phone: string; displayName: string | null; county: string | null } | null;
      }>;
      summary: { total: number; activeCount: number };
    }>(`/api/v1/admin/subscriptions${q}`);
  },
  updateFeedback: (id: string, body: Record<string, unknown>) =>
    apiFetch<{ feedback: ServiceFeedback }>(`/api/v1/admin/feedback/${id}`, {
      method: "PATCH",
      body,
    }),
  adminUserProfile: (id: string) => apiFetch<{ user: UserProfile }>(`/api/v1/admin/users/${id}`),
  me: (token?: string) => apiFetch<{ user: ApiUser }>("/api/v1/me", { token }),
  adminUsers: () => apiFetch<{ users: AdminUser[] }>("/api/v1/admin/users"),
  adminListings: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return apiFetch<{ listings: AdminListing[] }>(`/api/v1/admin/listings${q}`);
  },
  agentListings: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return apiFetch<{ listings: AdminListing[] }>(`/api/v1/agent/listings${q}`);
  },
  agentListing: (id: string) =>
    apiFetch<{ listing: AdminListing }>(`/api/v1/agent/listings/${id}`),
  createAgentListing: (body: Record<string, unknown>) =>
    apiFetch<{ listing: AdminListing }>("/api/v1/agent/listings", {
      method: "POST",
      body,
    }),
  updateAgentListing: (id: string, body: Record<string, unknown>) =>
    apiFetch<{ listing: AdminListing }>(`/api/v1/agent/listings/${id}`, {
      method: "PATCH",
      body,
    }),
  adminListing: (id: string) =>
    apiFetch<{ listing: AdminListing }>(`/api/v1/admin/listings/${id}`),
  createListing: (body: Record<string, unknown>) =>
    apiFetch<{ listing: AdminListing }>("/api/v1/admin/listings", {
      method: "POST",
      body,
    }),
  updateListing: (id: string, body: Record<string, unknown>) =>
    apiFetch<{ listing: AdminListing }>(`/api/v1/admin/listings/${id}`, {
      method: "PATCH",
      body,
    }),
  deleteListing: (id: string) =>
    apiFetch<{ ok: boolean; id: string }>(`/api/v1/admin/listings/${id}`, {
      method: "DELETE",
    }),
  publishListing: (id: string) =>
    apiFetch(`/api/v1/admin/listings/${id}/publish`, { method: "POST", body: {} }),
  archiveListing: (id: string) =>
    apiFetch(`/api/v1/admin/listings/${id}/archive`, { method: "POST", body: {} }),
  adminStations: () =>
    apiFetch<{ stations: LaundryStation[] }>("/api/v1/admin/laundry/stations"),
  createStation: (body: Record<string, unknown>) =>
    apiFetch<{ station: LaundryStation }>("/api/v1/admin/laundry/stations", {
      method: "POST",
      body,
    }),
  adminLaundryOrders: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return apiFetch<LaundryOrder[]>(`/api/v1/admin/laundry/orders${q}`);
  },
  updateOrderStatus: (id: string, status: string, note?: string) =>
    apiFetch<LaundryOrder>(`/api/v1/admin/laundry/orders/${id}/status`, {
      method: "PATCH",
      body: { status, note },
    }),
  logOrderTracking: (id: string, kind: string, note?: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/admin/laundry/orders/${id}/tracking`, {
      method: "POST",
      body: { kind, note },
    }),
  createLaundryOrder: (body: Record<string, unknown>) =>
    apiFetch<LaundryOrder>("/api/v1/laundry/orders", { method: "POST", body }),
};
