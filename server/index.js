/**
 * Barge Brain API server.
 *
 * Environment variables:
 *   PORT             – HTTP port (Railway sets this automatically).
 *   DATABASE_PATH    – Absolute path to barge-brain.sqlite.
 *                      Default: <server_dir>/data/barge-brain.sqlite
 *                      On Railway: set to the volume mount path, e.g. /data/barge-brain.sqlite
 *                      (attach a volume to this service and mount it at /data).
 *   FRONTEND_URL     – Allowed CORS origin in production,
 *                      e.g. https://your-frontend.up.railway.app
 *   ADMIN_USERNAME   – Login username (default: admin)
 *   ADMIN_PASSWORD   – Login password (required in production)
 *   JWT_SECRET       – Secret used to sign session tokens (required in production)
 *
 * First-boot behaviour:
 *   When DATABASE_PATH differs from the bundled seed path and the target file
 *   does not yet exist (empty volume), the server copies the bundled seed DB
 *   into place automatically.
 */

import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const SEED_PATH = path.join(__dirname, "data", "barge-brain.sqlite");
const DB_PATH = process.env.DATABASE_PATH || SEED_PATH;
const FRONTEND_URL = process.env.FRONTEND_URL;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "BargeBrain";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const TOKEN_COOKIE = "bb_token";
const TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

// ── First-boot: seed the volume DB if it doesn't exist yet ───────────────────
if (DB_PATH !== SEED_PATH && !fs.existsSync(DB_PATH)) {
  if (!fs.existsSync(SEED_PATH)) {
    console.error("Seed database not found at", SEED_PATH);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.copyFileSync(SEED_PATH, DB_PATH);
  console.log(`Seeded volume: ${SEED_PATH} → ${DB_PATH}`);
}

const db = new Database(DB_PATH, { readonly: true });

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: FRONTEND_URL || true,
    credentials: true,
    methods: ["GET", "POST"],
  })
);

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const raw = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${TOKEN_COOKIE}=`))
    ?.slice(TOKEN_COOKIE.length + 1);

  if (!raw) return res.status(401).json({ error: "Not authenticated" });

  try {
    jwt.verify(raw, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid" });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect username or password" });
  }

  const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: "8h" });

  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=${token}; HttpOnly; SameSite=Strict; Max-Age=${TOKEN_MAX_AGE_MS / 1000}; Path=/`
  );
  res.json({ ok: true });
});

app.post("/api/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/`
  );
  res.json({ ok: true });
});

app.get("/api/raw", requireAuth, (_req, res) => {
  try {
    const row = db.prepare("SELECT payload FROM raw_bundle WHERE id = 1").get();
    if (!row) {
      return res.status(404).json({ error: "No data found in database" });
    }
    res.json(JSON.parse(row.payload));
  } catch (err) {
    console.error("/api/raw error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Barge Brain API listening on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  if (FRONTEND_URL) console.log(`CORS origin: ${FRONTEND_URL}`);
  if (!process.env.JWT_SECRET) console.warn("⚠ JWT_SECRET not set — using insecure dev default");
  if (!process.env.ADMIN_PASSWORD) console.warn("⚠ ADMIN_PASSWORD not set — using insecure dev default");
});
