/** Seeded dev accounts — one-click login until real OTP/SMS is live. */
export const DEV_LOGIN_ROLES = ["admin", "agent", "user"] as const;
export type DevLoginRole = (typeof DEV_LOGIN_ROLES)[number];

export type DevAccount = {
  role: DevLoginRole;
  phone: string;
  phoneShort: string;
  label: string;
  description: string;
};

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    role: "admin",
    phone: "+254700000001",
    phoneShort: "700000001",
    label: "Admin",
    description: "Full ops console — FUA queue, users, listings",
  },
  {
    role: "agent",
    phone: "+254700000002",
    phoneShort: "700000002",
    label: "Agent",
    description: "Manage your own listings (Kisumu Agent)",
  },
  {
    role: "user",
    phone: "+254700000004",
    phoneShort: "700000004",
    label: "User",
    description: "Browse keja, book FUA, submit feedback",
  },
];

export function devAccountForRole(role: DevLoginRole): DevAccount | undefined {
  return DEV_ACCOUNTS.find((a) => a.role === role);
}
