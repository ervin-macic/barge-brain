/**
 * Rebuilds src/data/rawDataFromLegacy.js from legacy Excel (dfVoyElm, dfVoyage, dfBarge,
 * dfVoyTerm, dfRotation) and merges non-TEU fields from src/data/rawData.js where useful.
 * Run: node scripts/build-raw-data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadXlsxData, mergeExcelDateTime } from "./lib/legacyXlsx.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT = path.join(root, "src/data/rawDataFromLegacy.js");

function toNum(x) {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function pct(num, den) {
  if (num == null || den == null || den <= 0) return null;
  return Math.round((1000 * num) / den) / 10;
}

function teuPctValue(teu, maxTeu) {
  if (teu == null || maxTeu == null || maxTeu <= 0) return null;
  if (teu === 0) return null;
  return pct(teu, maxTeu);
}

function weightPctValue(w, maxW) {
  if (w == null || maxW == null || maxW <= 0) return null;
  if (w === 0) return null;
  return pct(w, maxW);
}

/** Ensure depart ISO string is not after arrive when both are parseable */
function orderDepartArrive(depart, arrive) {
  if (depart == null || arrive == null) return { depart, arrive };
  const td = Date.parse(depart);
  const ta = Date.parse(arrive);
  if (Number.isNaN(td) || Number.isNaN(ta)) return { depart, arrive };
  if (td <= ta) return { depart, arrive };
  return { depart: arrive, arrive: depart };
}

function legKey(code, portFrom, portTo) {
  return `${code}|${portFrom}|${portTo}`;
}

function oldLegMap(old) {
  const m = new Map();
  for (const leg of old.legs) {
    if (!leg?.code) continue;
    const k = legKey(leg.code, leg.portFrom, leg.portTo);
    if (!m.has(k)) m.set(k, leg);
  }
  return m;
}

/**
 * @param {object} termRow
 */
function termToAux(termRow) {
  if (!termRow) return null;
  const prenot = toNum(termRow.PORTBASEMCATOTALSENT);
  const appt = Boolean(
    termRow.COPINOCODE ||
      termRow.ETDDATE != null ||
      termRow.EDATE != null ||
      termRow.PORTBASEMCAPTADATE != null ||
      termRow.PORTBASEMCAPTDDATE != null
  );
  return { appt, prenotSent: prenot };
}

function loadRawDataFile() {
  const p = path.join(root, "src/data/rawData.js");
  const full = fs.readFileSync(p, "utf8");
  return new Function(
    full.replace(/^\s*export\s+const\s+RAW\s*=\s*/m, "return ")
  )();
}

async function main() {
  const OLD = loadRawDataFile();
  const velm = await loadXlsxData("dfVoyElm.xlsx");
  const vvoy = await loadXlsxData("dfVoyage.xlsx");
  const barges = await loadXlsxData("dfBarge.xlsx");
  const vterm = await loadXlsxData("dfVoyTerm.xlsx");
  const rots = await loadXlsxData("dfRotation.xlsx");

  const byCode = Object.fromEntries(vvoy.map((r) => [r.CODE, r]));
  const bargeByCode = Object.fromEntries(
    barges.map((b) => [b.CODE, b])
  );
  const rotBySeq = Object.fromEntries(
    rots.map((r) => [Number(r.SEQ), r])
  );

  /** VOYAGE -> term rows in file order */
  const termByVoyage = {};
  for (const t of vterm) {
    const v = t.VOYAGE;
    if (!termByVoyage[v]) termByVoyage[v] = [];
    termByVoyage[v].push(t);
  }

  /** VOYAGE -> list of 0..n-1 leg indices in dfVoyElm file order */
  const legIndexInVoyage = {};
  const out = [];
  const oldM = oldLegMap(OLD);

  for (const e of velm) {
    const code = e.VOYAGE;
    const portFrom = e.PORT_FROM;
    const portTo = e.PORT_TO;
    if (!code || !portFrom || !portTo) continue;

    if (!legIndexInVoyage[code]) legIndexInVoyage[code] = 0;
    const tIdx = legIndexInVoyage[code]++;

    const v = byCode[code];
    if (!v) {
      console.warn("Missing dfVoyage row for", code);
    }

    const barge = v ? v.BARGE : code.slice(0, 3);
    const bInfo = bargeByCode[barge];
    const bMaxTeu = bInfo ? toNum(bInfo.MAXTEU) : null;
    const bMaxWeight = bInfo ? toNum(bInfo.MAXWEIGHT) : null;

    const seq = v ? Number(v.EXTERNALCODE) : NaN;
    const rot = Number.isFinite(seq) ? rotBySeq[seq] : null;
    const scopeIn = rot?.SCOPEINLOCATION || "HEINENOORDTUNNEL";
    const scopeOut = rot?.SCOPEOUTLOCATION || "HEINENOORDTUNNEL";

    const teu = toNum(e.TOTALTEU);
    const maxTeu = toNum(e.MAXTEU);
    const weight = toNum(e.TOTALWEIGHT);
    const maxWeight = bMaxWeight;

    let depart = null;
    let arrive = null;

    if (v && v.PORT_FROM === portFrom && v.PORT_TO === portTo) {
      depart = mergeExcelDateTime(v.DEPDATE, v.DEPTIME);
      arrive = mergeExcelDateTime(v.ARRDATE, v.ARRTIME);
    } else {
      const tList = termByVoyage[code] || [];
      const trow = tList[tIdx] || null;
      if (trow) {
        const depD = trow.ETDDATE != null ? trow.ETDDATE : trow.EDATE;
        const depT = trow.ETDTIME != null ? trow.ETDTIME : trow.ETIME;
        depart = mergeExcelDateTime(depD, depT);
        const arrD = trow.PORTBASEMCAPTDDATE ?? trow.PORTBASEMCAPTADATE;
        const arrT = trow.PORTBASEMCAPTDTIME ?? trow.PORTBASEMCAPTATIME;
        arrive = mergeExcelDateTime(arrD, arrT);
        const ord = orderDepartArrive(depart, arrive);
        depart = ord.depart;
        arrive = ord.arrive;
      }
    }

    const okey = legKey(code, portFrom, portTo);
    const old = oldM.get(okey) || null;

    if (depart == null && old?.depart) depart = old.depart;
    if (arrive == null && old?.arrive) arrive = old.arrive;

    const tList2 = termByVoyage[code] || [];
    const trow2 = tList2[tIdx] || null;
    const aux = termToAux(trow2);

    const appt = aux ? aux.appt : (old && old.appt != null ? old.appt : true);
    let prenotSent = aux && aux.prenotSent != null ? aux.prenotSent : null;
    if (prenotSent == null && old?.prenotSent != null) prenotSent = old.prenotSent;

    const leg = {
      barge: barge || null,
      code: code,
      ie: v ? v.IE : null,
      portFrom,
      portTo,
      depart,
      arrive,
      scopeIn,
      scopeOut,
      teu,
      maxTeu,
      teuPct: teuPctValue(teu, maxTeu),
      weight: weight,
      maxWeight: maxWeight,
      weightPct: weightPctValue(weight, maxWeight),
      bargeMaxTeu: bMaxTeu,
      appt,
      prenotSent: prenotSent,
      expTotal: old ? old.expTotal : null,
      expBlocked: old ? old.expBlocked : null,
      expCustNok: old ? old.expCustNok : null,
      expOrderNok: old ? old.expOrderNok : null,
      impTotal: old ? old.impTotal : null,
      impBlocked: old ? old.impBlocked : null,
      impCustNok: old ? old.impCustNok : null,
      impNotReleased: old ? old.impNotReleased : null,
      expNok: old && old.expNok != null ? old.expNok : 0,
      impNok: old && old.impNok != null ? old.impNok : 0,
      transfers: old && old.transfers != null ? old.transfers : null,
      overloaded: old && old.overloaded != null ? old.overloaded : false,
    };

    if (teu == null && old && old.teu != null) {
      if (e.TOTALTEU == null || e.TOTALTEU === "" || toNum(e.TOTALTEU) == null) {
        leg.teu = old.teu;
        leg.teuPct = teuPctValue(leg.teu, leg.maxTeu);
      }
    }
    if (maxTeu == null && old?.maxTeu != null) {
      leg.maxTeu = old.maxTeu;
      leg.teuPct = teuPctValue(leg.teu, leg.maxTeu);
    }
    if (weight == null && old?.weight != null) leg.weight = old.weight;
    if (bMaxWeight == null && old?.maxWeight != null) leg.maxWeight = old.maxWeight;
    if (bMaxTeu == null && old?.bargeMaxTeu != null) leg.bargeMaxTeu = old.bargeMaxTeu;
    if (barge == null && old?.barge) leg.barge = old.barge;
    if (leg.ie == null && old?.ie != null) leg.ie = old.ie;
    if (v == null && old) {
      leg.barge = old.barge;
      leg.ie = old.ie;
    }

    leg.weightPct = weightPctValue(leg.weight, leg.maxWeight);

    out.push(leg);
  }

  const text =
    `export const RAW = {\n` +
    `  "legs": ` +
    JSON.stringify(out, null, 2) +
    `,\n  "barges": ` +
    JSON.stringify(OLD.barges, null, 2) +
    `\n};\n`;
  fs.writeFileSync(OUT, text, "utf8");
  console.log("Wrote", OUT, "legs:", out.length);

  const vic = out.filter((L) => L.code && L.code.startsWith("VIC"));
  console.log("VIC legs", vic.length, [...new Set(vic.map((x) => x.code))].sort().join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
