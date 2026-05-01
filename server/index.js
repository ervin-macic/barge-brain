/**
 * Barge Brain API server.
 *
 * Environment variables:
 *   PORT           – HTTP port (Railway sets this automatically).
 *   DATABASE_PATH  – Absolute path to barge-brain.sqlite.
 *                    Default: <server_dir>/data/barge-brain.sqlite
 *                    On Railway: set to the volume mount path, e.g. /data/barge-brain.sqlite
 *                    (attach a volume to this service and mount it at /data).
 *   FRONTEND_URL   – Allowed CORS origin in production,
 *                    e.g. https://your-frontend.up.railway.app
 *
 * First-boot behaviour:
 *   When DATABASE_PATH differs from the bundled seed path and the target file
 *   does not yet exist (empty volume), the server copies the bundled seed DB
 *   into place automatically.
 */

import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const SEED_PATH = path.join(__dirname, "data", "barge-brain.sqlite");
const DB_PATH = process.env.DATABASE_PATH || SEED_PATH;
const FRONTEND_URL = process.env.FRONTEND_URL;

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

app.use(
  cors({
    origin: FRONTEND_URL || true,
    methods: ["GET"],
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/raw", (_req, res) => {
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
});
