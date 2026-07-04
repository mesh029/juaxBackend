export type PhaseTestResult = {
  name: string;
  phase: number;
  passed: boolean;
  durationMs: number;
  detail?: string;
  error?: string;
};

export type PhaseSuite = {
  phase: number;
  title: string;
  description: string;
};

export const PHASE_SUITES: PhaseSuite[] = [
  { phase: 0, title: "Foundation", description: "Health, DB, services, stations" },
  { phase: 1, title: "Auth", description: "OTP send/verify, JWT, /me" },
  { phase: 2, title: "Saka Keja", description: "Listings, nearby, location gate, plans" },
  { phase: 4, title: "Jua Fua", description: "Laundry stations & orders" },
  { phase: 8, title: "Rides", description: "Coming soon flag" },
];

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - start) };
}

export async function runPhaseTests(
  phase: number,
  opts?: { phone?: string; onOtp?: (code: string) => void },
): Promise<PhaseTestResult[]> {
  const results: PhaseTestResult[] = [];
  const phone = opts?.phone ?? `79${String(Date.now()).slice(-7)}`;
  let token = "";
  let devCode = "";
  let listingId = "";

  const push = (name: string, p: number, passed: boolean, ms: number, detail?: string, error?: string) => {
    results.push({ name, phase: p, passed, durationMs: ms, detail, error });
  };

  if (phase === 0) {
    try {
      const { result, ms } = await timed(() => fetch("/api/health").then((r) => r.json()));
      push("GET /api/health", 0, result.status === "ok" && result.db === "connected", ms, JSON.stringify(result));
    } catch (e) {
      push("GET /api/health", 0, false, 0, undefined, String(e));
    }

    try {
      const { result, ms } = await timed(() => fetch("/api/v1/listings?county=kisumu").then((r) => r.json()));
      const ok = Array.isArray(result) && result.length >= 1;
      if (ok) listingId = result[0].id;
      push("GET /api/v1/listings", 0, ok, ms, `${result.length} listings`);
    } catch (e) {
      push("GET /api/v1/listings", 0, false, 0, undefined, String(e));
    }

    try {
      const { result, ms } = await timed(() => fetch("/api/v1/laundry/stations").then((r) => r.json()));
      push("GET /api/v1/laundry/stations", 0, Array.isArray(result) && result.length >= 1, ms, `${result.length} stations`);
    } catch (e) {
      push("GET /api/v1/laundry/stations", 0, false, 0, undefined, String(e));
    }
  }

  if (phase === 1) {
    try {
      const { result, ms } = await timed(() =>
        fetch("/api/v1/auth/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }).then((r) => r.json()),
      );
      devCode = result.devCode ?? "";
      if (devCode) opts?.onOtp?.(devCode);
      push("POST /auth/otp/send", 1, result.ok === true && !!devCode, ms);
    } catch (e) {
      push("POST /auth/otp/send", 1, false, 0, undefined, String(e));
    }

    try {
      const { result, ms } = await timed(() =>
        fetch("/api/v1/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: devCode, name: "Lab Tester" }),
        }).then((r) => r.json()),
      );
      token = result.token ?? "";
      push("POST /auth/otp/verify", 1, !!token && result.user?.role === "user", ms);
    } catch (e) {
      push("POST /auth/otp/verify", 1, false, 0, undefined, String(e));
    }

    try {
      const { result, ms } = await timed(() =>
        fetch("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      );
      push("GET /api/v1/me", 1, !!result.user?.phone, ms);
    } catch (e) {
      push("GET /api/v1/me", 1, false, 0, undefined, String(e));
    }
  }

  if (phase === 2) {
    try {
      const { result, ms } = await timed(() => fetch("/api/v1/listings?type=rental&county=kisumu").then((r) => r.json()));
      const ok = Array.isArray(result) && result.every((l: { type: string }) => l.type === "rental");
      if (result[0]) listingId = result[0].id;
      push("GET /listings?type=rental", 2, ok, ms);
    } catch (e) {
      push("GET /listings?type=rental", 2, false, 0, undefined, String(e));
    }

    try {
      const { result, ms } = await timed(() =>
        fetch("/api/v1/listings/nearby?lat=-0.0917&lng=34.7680&radiusKm=10").then((r) => r.json()),
      );
      push("GET /listings/nearby", 2, result.listings?.length >= 1, ms, `${result.listings?.length} nearby`);
    } catch (e) {
      push("GET /listings/nearby", 2, false, 0, undefined, String(e));
    }

    if (listingId) {
      try {
        const { result, ms } = await timed(() => fetch(`/api/v1/listings/${listingId}`).then((r) => r.json()));
        const ok = result.locationLocked === true && !("exactAddress" in result);
        push("GET /listings/[id] gate", 2, ok, ms);
      } catch (e) {
        push("GET /listings/[id] gate", 2, false, 0, undefined, String(e));
      }
    }

    try {
      const { result, ms } = await timed(() => fetch("/api/v1/subscriptions/plans").then((r) => r.json()));
      push("GET /subscriptions/plans", 2, result.plans?.length === 3, ms);
    } catch (e) {
      push("GET /subscriptions/plans", 2, false, 0, undefined, String(e));
    }
  }

  if (phase === 4) {
    try {
      const { result, ms } = await timed(() => fetch("/api/v1/laundry/stations").then((r) => r.json()));
      push("GET /laundry/stations", 4, Array.isArray(result), ms);
    } catch (e) {
      push("GET /laundry/stations", 4, false, 0, undefined, String(e));
    }

    let userToken = token;
    if (!userToken) {
      const phone = `79${String(Date.now()).slice(-7)}`;
      const sendRes = await fetch("/api/v1/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const sendData = await sendRes.json();
      const verifyRes = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: sendData.devCode }),
      });
      const verifyData = await verifyRes.json();
      userToken = verifyData.token;
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().slice(0, 10);
      const { result, ms } = await timed(() =>
        fetch("/api/v1/laundry/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            pickupMode: "door",
            pickupAddress: "Test Rd, Kisumu",
            loadKg: 4,
            scheduleDate: date,
            scheduleBand: "morning",
          }),
        }).then((r) => r.json()),
      );
      push("POST /laundry/orders", 4, !!result.id && result.totalKes > 0, ms, `KES ${result.totalKes}`);
    } catch (e) {
      push("POST /laundry/orders", 4, false, 0, undefined, String(e));
    }
  }

  if (phase === 8) {
    try {
      const { result, ms } = await timed(() => fetch("/api/v1/services").then((r) => r.json()));
      push("GET /services rides flag", 8, result.rides?.enabled === false, ms);
    } catch (e) {
      push("GET /services rides flag", 8, false, 0, undefined, String(e));
    }
  }

  return results;
}
