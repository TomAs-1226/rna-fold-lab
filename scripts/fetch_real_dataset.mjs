// Downloads a REAL published CRISPR guide-efficiency dataset and writes it to
// public/data/guides.json in the shape the website expects.
//
// Source: Doench et al. (2014), "Rational design of highly active sgRNAs for
// CRISPR-Cas9-mediated gene inactivation" (Nature Biotechnology 32, 1262-1267),
// human dataset, as compiled by Haeussler et al. (2016), "Evaluation of off-target
// and on-target scoring algorithms ... CRISPOR" (Genome Biology 17, 148).
//
// Each guide has a measured editing efficiency (modFreq, 0-1). We take the 20-letter
// spacer from the 23-mer, fold it with our own Nussinov code, and measure seed
// openness — so the Dataset page can ask: do more-open guides tend to work better?
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "public", "data");
mkdirSync(dataDir, { recursive: true });

const URL =
  "https://raw.githubusercontent.com/maximilianh/crisporPaper/master/effData/doench2014-Hs.scores.tab";

// The fixed sgRNA scaffold. We fold the WHOLE guide (spacer + scaffold), because the
// scaffold is what actually pairs with the seed and hides it — spacer-only folding
// misses that. Openness is precomputed here so the Dataset page loads instantly.
const SCAFFOLD = "GUUUUAGAGCUAGAAAUAGCAAGUUAAAAUAAGGCUAGUCCGUUAUCAACUUGAAAAAGUGGCACCGAGUCGGUGC";
const canPair = (a, b) => ["AU", "UA", "GC", "CG", "GU", "UG"].includes(a + b);
function seedOpenness(dna) {
  const s = dna.replace(/T/g, "U") + SCAFFOLD;
  const n = s.length;
  const mL = 3;
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  for (let sp = mL + 1; sp < n; sp++)
    for (let i = 0; i + sp < n; i++) {
      const j = i + sp;
      let b = dp[i][j - 1];
      for (let k = i; k < j - mL; k++)
        if (canPair(s[k], s[j])) {
          const l = k > i ? dp[i][k - 1] : 0;
          b = Math.max(b, l + dp[k + 1][j - 1] + 1);
        }
      dp[i][j] = b;
    }
  const P = new Set();
  const st = [[0, n - 1]];
  while (st.length) {
    const [i, j] = st.pop();
    if (i >= j) continue;
    if (dp[i][j] === dp[i][j - 1]) {
      st.push([i, j - 1]);
      continue;
    }
    for (let k = i; k < j - mL; k++)
      if (canPair(s[k], s[j])) {
        const l = k > i ? dp[i][k - 1] : 0;
        if (dp[i][j] === l + dp[k + 1][j - 1] + 1) {
          P.add(k);
          P.add(j);
          if (k > i) st.push([i, k - 1]);
          st.push([k + 1, j - 1]);
          break;
        }
      }
  }
  // seed = the last 8 letters of the 20-nt spacer (positions 12..19, nearest the PAM)
  let o = 0;
  for (let i = 12; i < 20; i += 1) if (!P.has(i)) o += 1;
  return o / 8;
}
const gcOf = (s) => [...s].filter((b) => b === "G" || b === "C").length / s.length;

// --- stats ---
const rank = (v) => {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = Array(v.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const a = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = a;
    i = j + 1;
  }
  return r;
};
const pearson = (x, y) => {
  const n = x.length,
    mx = x.reduce((a, b) => a + b, 0) / n,
    my = y.reduce((a, b) => a + b, 0) / n;
  let nu = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx,
      b = y[i] - my;
    nu += a * b;
    dx += a * a;
    dy += b * b;
  }
  return nu / Math.sqrt(dx * dy);
};
const spearman = (x, y) => pearson(rank(x), rank(y));

const res = await fetch(URL);
if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
const text = await res.text();
const lines = text.trim().split("\n");
const header = lines[0].split("\t");
const iSeq = header.indexOf("seq");
const iMod = header.indexOf("modFreq");
const iName = header.indexOf("guide");

const guides = [];
for (let r = 1; r < lines.length; r++) {
  const cols = lines[r].split("\t");
  const seq = (cols[iSeq] || "").toUpperCase();
  const spacer = seq.slice(0, 20);
  const mod = parseFloat(cols[iMod]);
  if (spacer.length !== 20 || /[^ACGT]/.test(spacer) || !isFinite(mod)) continue;
  const name = cols[iName] || `g${r}`;
  const gene = name.split("-")[0];
  guides.push({
    id: name,
    gene,
    spacer,
    gcPercent: Math.round(gcOf(spacer) * 1000) / 10,
    activity: Math.round(Math.max(0, Math.min(1, mod)) * 1000) / 1000,
    seedOpenness: Math.round(seedOpenness(spacer) * 1000) / 1000,
    source: "Doench 2014 (human), via CRISPOR / Haeussler 2016",
  });
}

writeFileSync(join(dataDir, "guides.json"), JSON.stringify(guides, null, 2));

// --- real findings (printed so we can describe them honestly) ---
const open = guides.map((g) => g.seedOpenness);
const act = guides.map((g) => g.activity);
const gc = guides.map((g) => g.gcPercent);
const withT = guides.filter((g) => g.spacer.includes("TTTT")).map((g) => g.activity);
const noT = guides.filter((g) => !g.spacer.includes("TTTT")).map((g) => g.activity);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

console.log(`Wrote ${guides.length} REAL guides to public/data/guides.json`);
console.log("--- findings (Spearman) ---");
console.log("seed openness vs activity:", spearman(open, act).toFixed(3));
console.log("GC%% vs activity:         ", spearman(gc, act).toFixed(3));
console.log(`TTTT run: mean activity ${mean(withT).toFixed(3)} (n=${withT.length}) vs ${mean(noT).toFixed(3)} (n=${noT.length}) without`);
console.log("genes:", [...new Set(guides.map((g) => g.gene))].join(", "));
