import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../legacy/data");

/**
 * @param {string} file - basename under legacy/data, e.g. "dfVoyElm.xlsx"
 * @param {{[k:string]: string}} [opts] - xlsx read options; uses first sheet, raw numbers for dates/nums
 * @returns {object[]}
 */
export async function loadXlsxData(file) {
  const p = file.includes("/")
    ? file
    : path.isAbsolute(file)
    ? file
    : path.join(DATA_DIR, file);
  const buf = await readFile(p);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false, raw: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

/**
 * Map Excel date serial + "HHmm" or "H:mm" string to ISO local-style string
 * (matches existing rawData: "2026-02-05T10:00:00" without Z).
 * @param {number|null|undefined} serial
 * @param {string|number|null|undefined} timeStr
 */
export function mergeExcelDateTime(serial, timeStr) {
  if (serial == null) return null;
  const dayMs = 86400 * 1000;
  const d = new Date((Math.floor(serial) - 25569) * dayMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  let h = 0;
  let m = 0;
  if (timeStr != null && timeStr !== "") {
    const s = String(timeStr).trim();
    if (s.includes(":")) {
      const p = s.split(":");
      h = Number(p[0]) || 0;
      m = Number(p[1]) || 0;
    } else if (s.length >= 3) {
      const pad = s.length <= 2 ? s.padStart(2, "0") : s;
      h = Number(s.slice(0, -2)) || 0;
      m = Number(s.slice(-2)) || 0;
    } else {
      h = Number(s) || 0;
    }
  }
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${y}-${mo}-${da}T${hh}:${mm}:00`;
}
