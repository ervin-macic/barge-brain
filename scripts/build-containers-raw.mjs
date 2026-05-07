/**
 * Generates src/data/containersRaw.js from legacy Excel files:
 *   - legacy/data/dfUnitExp.xlsx  → CONTAINERS_RAW.exp
 *   - legacy/data/dfUnitImp.xlsx  → CONTAINERS_RAW.imp
 *
 * Rows are serialised 1:1, preserving original column names.
 * Run: node scripts/build-containers-raw.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadXlsxData } from "./lib/legacyXlsx.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT = path.join(root, "src/data/containersRaw.js");

async function main() {
  const exp = await loadXlsxData("dfUnitExp.xlsx");
  const imp = await loadXlsxData("dfUnitImp.xlsx");

  const text =
    `export const CONTAINERS_RAW = {\n` +
    `  "exp": ` + JSON.stringify(exp, null, 2) +
    `,\n  "imp": ` + JSON.stringify(imp, null, 2) +
    `\n};\n`;

  fs.writeFileSync(OUT, text, "utf8");
  console.log("Wrote", OUT);
  console.log("  exp rows:", exp.length);
  console.log("  imp rows:", imp.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
