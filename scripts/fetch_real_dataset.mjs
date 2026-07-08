// Downloads a REAL published CRISPR guide-efficiency dataset and writes it to
// public/data/guides.json in the shape the website expects.
//
// Source: Doench, Fusi, et al. (2016), "Optimized sgRNA design to maximize activity
// and minimize off-target effects of CRISPR-Cas9" (Nature Biotechnology 34, 184-191) —
// the large "Rule Set 2" on-target dataset — as compiled by Haeussler et al. (2016),
// "Evaluation of off-target and on-target scoring algorithms ... CRISPOR" (Genome Biology 17, 148).
//
// The raw activity score is a continuous z-score, so we convert it to a PERCENTILE
// (0 = least active in the screen, 1 = most active). Percentile is scale-free and is
// what the model learns to predict. We also fold each full guide with our own code to
// precompute seed openness, so the Dataset page loads instantly.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "public", "data");
mkdirSync(dataDir, { recursive: true });

// Two real on-target datasets, pooled for more (and more diverse) training data.
// Each guide's activity is percentile-ranked WITHIN its own dataset, so the two
// assays' different scales become comparable ("how active vs. others in its screen").
const SOURCES = [
  { url: "https://raw.githubusercontent.com/maximilianh/crisporPaper/master/effData/doench2016_hg19.scores.tab", tag: "Doench2016" },
  { url: "https://raw.githubusercontent.com/maximilianh/crisporPaper/master/effData/doench2014-Hs.scores.tab", tag: "Doench2014" },
];
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
    if (dp[i][j] === dp[i][j - 1]) { st.push([i, j - 1]); continue; }
    for (let k = i; k < j - mL; k++)
      if (canPair(s[k], s[j])) {
        const l = k > i ? dp[i][k - 1] : 0;
        if (dp[i][j] === l + dp[k + 1][j - 1] + 1) { P.add(k); P.add(j); if (k > i) st.push([i, k - 1]); st.push([k + 1, j - 1]); break; }
      }
  }
  let o = 0;
  for (let i = 12; i < 20; i++) if (!P.has(i)) o += 1;
  return o / 8;
}
const gcOf = (s) => [...s].filter((b) => b === "G" || b === "C").length / s.length;

const rank = (v) => {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = Array(v.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const a = (i + j) / 2;
    for (let k = i; k <= j; k++) r[idx[k][1]] = a;
    i = j + 1;
  }
  return r;
};
const pearson = (x, y) => {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let nu = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; nu += a * b; dx += a * a; dy += b * b; }
  return nu / Math.sqrt(dx * dy);
};
const spearman = (x, y) => pearson(rank(x), rank(y));

// collect + percentile-rank within each dataset, then pool
const guides = [];
for (const src of SOURCES) {
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`download failed for ${src.tag}: HTTP ${res.status}`);
  const lines = (await res.text()).trim().split("\n");
  const header = lines[0].split("\t");
  const iSeq = header.indexOf("seq");
  const iMod = header.indexOf("modFreq");
  const iName = header.indexOf("guide");
  const raw = [];
  for (let r = 1; r < lines.length; r++) {
    const c = lines[r].split("\t");
    const spacer = (c[iSeq] || "").toUpperCase().slice(0, 20);
    const mod = parseFloat(c[iMod]);
    if (!/^[ACGT]{20}$/.test(spacer) || !isFinite(mod)) continue;
    raw.push({ spacer, mod, name: c[iName] || `g${r}` });
  }
  const ranks = rank(raw.map((x) => x.mod));
  const N = raw.length;
  console.log(`${src.tag}: ${N} guides — folding to precompute seed openness…`);
  for (let i = 0; i < N; i++) {
    guides.push({
      id: `${src.tag}-${i}`,
      gene: (raw[i].name.split(/[-_ ]/)[0] || "guide").slice(0, 10),
      spacer: raw[i].spacer,
      gcPercent: Math.round(gcOf(raw[i].spacer) * 1000) / 10,
      activity: Math.round((ranks[i] / (N - 1)) * 1000) / 1000, // within-dataset percentile
      seedOpenness: Math.round(seedOpenness(raw[i].spacer) * 1000) / 1000,
      source: "Doench 2014 + 2016, via CRISPOR / Haeussler 2016 — activity as within-dataset percentile",
    });
  }
}

writeFileSync(join(dataDir, "guides.json"), JSON.stringify(guides, null, 2));

const open = guides.map((g) => g.seedOpenness);
const act = guides.map((g) => g.activity);
const gc = guides.map((g) => g.gcPercent);
console.log(`Wrote ${guides.length} REAL guides to public/data/guides.json`);
console.log("--- findings (Spearman) ---");
console.log("seed openness vs activity:", spearman(open, act).toFixed(3));
console.log("GC% vs activity:          ", spearman(gc, act).toFixed(3));
