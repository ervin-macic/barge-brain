/**
 * One-shot import of legacy/data/*.xlsx into a single SQLite file (7 tables).
 * Regenerate: node scripts/xlsx-to-sqlite.mjs
 * Requires: xlsx, sql.js (devDependencies)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import initSqlJs from "sql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDb = path.join(root, "legacy/barge_data.sqlite");
const dataDir = path.join(root, "legacy/data");

const INPUTS = [
  "dfBarge.xlsx",
  "dfRotation.xlsx",
  "dfTransfers.xlsx",
  "dfUnitExp.xlsx",
  "dfVoyElm.xlsx",
  "dfVoyTerm.xlsx",
  "dfVoyage.xlsx",
];

const TABLE_BY_FILE = {
  "dfBarge.xlsx": "df_barge",
  "dfRotation.xlsx": "df_rotation",
  "dfTransfers.xlsx": "df_transfers",
  "dfUnitExp.xlsx": "df_unit_exp",
  "dfVoyElm.xlsx": "df_voy_elm",
  "dfVoyTerm.xlsx": "df_voy_term",
  "dfVoyage.xlsx": "df_voyage",
};

function ident(s) {
  return String(s).replace(/[^a-zA-Z0-9_]/g, "_");
}

function sanitizeHeaders(row) {
  return row.map((c, i) => {
    const b = c != null && String(c).trim() !== "" ? ident(String(c)) : `col_${i + 1}`;
    return b || `col_${i + 1}`;
  });
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run("PRAGMA foreign_keys = OFF;");

  for (const name of INPUTS) {
    const fpath = path.join(dataDir, name);
    if (!fs.existsSync(fpath)) {
      throw new Error("Missing " + fpath);
    }
    const wb = XLSX.readFile(fpath, { type: "file", cellDates: true, raw: true });
    const table = TABLE_BY_FILE[name] || ident(name.replace(/\.xlsx$/i, ""));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    if (aoa.length < 1) {
      console.warn("Skip empty", name);
      continue;
    }
    const header = sanitizeHeaders(aoa[0]);
    const colList = header.map((h) => `"${h}" TEXT`);
    const ddl = `DROP TABLE IF EXISTS "${table}"; CREATE TABLE "${table}" (${colList.join(", ")});`;
    db.run(ddl);

    const stmt = db.prepare(
      `INSERT INTO "${table}" VALUES (${header.map(() => "?").join(",")})`
    );
    const norm = (v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "object" && !(v instanceof Date)) {
        return JSON.stringify(v);
      }
      if (v instanceof Date) {
        return v.toISOString();
      }
      return v;
    };

    db.run("BEGIN;");
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const vals = header.map((_, i) => norm(row[i] ?? null));
      stmt.run(vals);
    }
    db.run("COMMIT;");
    stmt.free();
    console.log(`Imported ${name} -> ${table} rows ${aoa.length - 1}`);
  }

  const data = db.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(outDb, buf);
  db.close();
  console.log("Wrote", outDb, "bytes", buf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
