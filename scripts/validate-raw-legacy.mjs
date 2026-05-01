/**
 * Verifies VIC (and all) dfVoyElm teu / maxteu match rawDataFromLegacy output.
 * Run: node scripts/validate-raw-legacy.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadRaw() {
  const p = path.join(root, "src/data/rawDataFromLegacy.js");
  const full = fs.readFileSync(p, "utf8");
  return new Function(
    full.replace(/^\s*export\s+const\s+RAW\s*=\s*/m, "return ")
  )();
}

const elm = XLSX.utils.sheet_to_json(
  XLSX.readFile(path.join(root, "legacy/data/dfVoyElm.xlsx")).Sheets.Sheet1,
  { defval: null, raw: true }
);
const { legs } = loadRaw();

const key = (r) => `${r.VOYAGE}|${r.PORT_FROM}|${r.PORT_TO}`;

const legByKey = new Map();
for (const l of legs) {
  legByKey.set(legKey(l), l);
}

function legKey(l) {
  return `${l.code}|${l.portFrom}|${l.portTo}`;
}

let err = 0;
for (const e of elm) {
  const k = key(e);
  const o = legByKey.get(k);
  if (!o) {
    console.error("Missing leg in output", k);
    err++;
    continue;
  }
  if (e.TOTALTEU != null && e.TOTALTEU !== "" && o.teu !== Number(e.TOTALTEU)) {
    console.error("teu mismatch", k, "out", o.teu, "elm", e.TOTALTEU);
    err++;
  }
  if (e.MAXTEU != null && e.MAXTEU !== "" && o.maxTeu !== Number(e.MAXTEU)) {
    console.error("maxTeu mismatch", k, "out", o.maxTeu, "elm", e.MAXTEU);
    err++;
  }
}

const vicCodes = new Set(
  legs.filter((l) => l.code && l.code.startsWith("VIC")).map((l) => l.code)
);
const vicCodesElm = new Set(
  elm.filter((r) => r.VOYAGE && String(r.VOYAGE).startsWith("VIC")).map((r) => r.VOYAGE)
);
for (const c of vicCodesElm) {
  if (![...vicCodes].includes(c)) {
    console.error("VIC code in elm not in out", c);
    err++;
  }
}

if (err === 0) {
  console.log("OK: all", elm.length, "legs match dfVoyElm teu / maxTeu. VIC voyages:", [...vicCodes].sort().join(", "));
} else {
  process.exit(1);
}
