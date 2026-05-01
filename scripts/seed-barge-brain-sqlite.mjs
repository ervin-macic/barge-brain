/**
 * Generates server/data/barge-brain.sqlite from src/data/rawDataFromLegacy.js.
 *
 * Run: npm run seed:server-db
 *
 * The database contains a single table `raw_bundle` with one row holding the
 * full JSON payload that the Express backend serves at GET /api/raw.
 * Re-run whenever rawDataFromLegacy.js changes and commit the result.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import initSqlJs from "sql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// rawDataFromLegacy.js is an ES module in a CJS-typed package, so we read and
// strip the `export const RAW = ` wrapper rather than trying to import it.
function loadRaw() {
  const src = fs.readFileSync(
    path.join(__dirname, "../src/data/rawDataFromLegacy.js"),
    "utf8"
  );
  // File is: export const RAW = { ... };\n
  const json = src.replace(/^\s*export const RAW\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(json);
}

const outDir = path.join(__dirname, "..", "server", "data");
const outDb = path.join(outDir, "barge-brain.sqlite");

async function main() {
  const RAW = loadRaw();
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE raw_bundle (
      id      INTEGER PRIMARY KEY,
      payload TEXT NOT NULL
    );
  `);

  const payload = JSON.stringify({ legs: RAW.legs, barges: RAW.barges });
  db.run("INSERT INTO raw_bundle (id, payload) VALUES (1, ?);", [payload]);

  fs.mkdirSync(outDir, { recursive: true });
  const data = db.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(outDb, buf);
  db.close();

  console.log(
    `Wrote ${outDb}`,
    `| ${buf.length} bytes`,
    `| ${RAW.legs.length} legs`,
    `| ${Object.keys(RAW.barges).length} barges`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
