import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { WebSocketServer } from "ws";
import { jwtVerify } from "jose";
import pg from "pg";

const dev = process.argv.includes("dev");
const port = Number(process.env.PORT || 5080);
const host = "0.0.0.0";

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: "jua-x",
    audience: "jua-x-app",
  });
  const userId = payload.sub;
  const role = payload.role;
  if (!userId || (role !== "user" && role !== "agent" && role !== "admin")) {
    throw new Error("Invalid token payload");
  }
  return { userId, role };
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL not set");
}
const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=[^&]+/, "").replace(/\?$/, ""),
  ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
});

async function fetchActivitySnapshot(client) {
  const { userId, role } = client;
  if (role === "admin") {
    const [requests, userMsgs, laundry] = await Promise.all([
      pool.query(
        "SELECT COUNT(*)::int AS requested, COALESCE(MAX(updated_at), NOW()) AS latest FROM listing_requests WHERE status = 'requested'",
      ),
      pool.query(
        `SELECT COUNT(*)::int AS awaiting, COALESCE(MAX(m.created_at), NOW()) AS latest
         FROM listing_request_messages m
         JOIN listing_requests r ON r.id = m.request_id
         WHERE m.sender_role = 'user'`,
      ),
      pool.query(
        "SELECT COALESCE(MAX(updated_at), NOW()) AS latest FROM laundry_orders",
      ),
    ]);
    return {
      scope: "admin",
      requestedCount: requests.rows[0]?.requested ?? 0,
      awaitingUserMessages: userMsgs.rows[0]?.awaiting ?? 0,
      latestAt: Math.max(
        Date.parse(String(requests.rows[0]?.latest ?? 0)) || 0,
        Date.parse(String(userMsgs.rows[0]?.latest ?? 0)) || 0,
        Date.parse(String(laundry.rows[0]?.latest ?? 0)) || 0,
      ),
    };
  }

  const [reqs, msgs, laundry, bookings] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS active, COALESCE(MAX(updated_at), NOW()) AS latest
       FROM listing_requests
       WHERE user_id = $1 AND status IN ('requested','agent_contacted','rider_assigned','rider_en_route')`,
      [userId],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS ops, COALESCE(MAX(m.created_at), NOW()) AS latest
       FROM listing_request_messages m
       JOIN listing_requests r ON r.id = m.request_id
       WHERE r.user_id = $1 AND m.sender_role IN ('admin','system')`,
      [userId],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS active, COALESCE(MAX(updated_at), NOW()) AS latest
       FROM laundry_orders
       WHERE user_id = $1 AND status NOT IN ('delivered','cancelled')`,
      [userId],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS active, COALESCE(MAX(updated_at), NOW()) AS latest
       FROM bnb_bookings
       WHERE user_id = $1 AND status IN ('pending_payment','confirmed')`,
      [userId],
    ),
  ]);

  return {
    scope: "user",
    activeRequests: reqs.rows[0]?.active ?? 0,
    opsMessages: msgs.rows[0]?.ops ?? 0,
    activeLaundry: laundry.rows[0]?.active ?? 0,
    activeStays: bookings.rows[0]?.active ?? 0,
    latestAt: Math.max(
      Date.parse(String(reqs.rows[0]?.latest ?? 0)) || 0,
      Date.parse(String(msgs.rows[0]?.latest ?? 0)) || 0,
      Date.parse(String(laundry.rows[0]?.latest ?? 0)) || 0,
      Date.parse(String(bookings.rows[0]?.latest ?? 0)) || 0,
    ),
  };
}

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => handle(req, res));
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (req, socket, head) => {
  try {
    const reqUrl = new URL(req.url || "", `http://${req.headers.host}`);
    if (reqUrl.pathname !== "/ws/activity") {
      socket.destroy();
      return;
    }
    const token = reqUrl.searchParams.get("token");
    if (!token) {
      socket.destroy();
      return;
    }
    const claims = await verifyToken(token);
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.clientClaims = claims;
      wss.emit("connection", ws, req);
    });
  } catch {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  ws.userId = ws.clientClaims.userId;
  ws.role = ws.clientClaims.role;
  ws.lastDigest = "";

  const publish = async () => {
    if (ws.readyState !== ws.OPEN) return;
    try {
      const snapshot = await fetchActivitySnapshot(ws);
      const digest = JSON.stringify(snapshot);
      if (digest === ws.lastDigest) return;
      ws.lastDigest = digest;
      ws.send(
        JSON.stringify({
          type: "activity_update",
          snapshot,
          at: new Date().toISOString(),
        }),
      );
    } catch {
      // keep socket alive; next tick retries
    }
  };

  void publish();
  const timer = setInterval(() => {
    void publish();
  }, 5000);

  ws.on("message", (raw) => {
    const msg = String(raw || "");
    if (msg === "ping") ws.send("pong");
  });

  ws.on("close", () => clearInterval(timer));
  ws.on("error", () => clearInterval(timer));
});

server.listen(port, host, () => {
  console.log(`> Ready on http://${host}:${port} (${dev ? "dev" : "prod"})`);
  console.log("> WebSocket endpoint: /ws/activity");
});

