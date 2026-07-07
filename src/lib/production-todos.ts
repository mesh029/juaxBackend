/**
 * PRODUCTION bookmarks — swap stubs for real services before launch.
 * Search for `PRODUCTION_TODO` across the backend repo.
 */
export const PRODUCTION_TODO = {
  MPESA_DARAJA: "PRODUCTION_TODO: Safaricom Daraja STK push + callback webhook at /api/v1/webhooks/mpesa",
  PAYMENT_DEV_MODE: "PRODUCTION_TODO: Set PAYMENT_DEV_MODE=false in production; remove dummy receipt auto-confirm",
  SUBSCRIPTION_PLANS_ADMIN: "PRODUCTION_TODO: Admin-configurable plan prices via GET/PATCH /admin/settings",
  LISTING_REQUESTS_TABLE: "PRODUCTION_TODO: Promote viewing/tour requests from service_feedback to listing_requests",
  PUSH_NOTIFICATIONS: "PRODUCTION_TODO: Notify users on FUA status change and listing request updates",
} as const;
