// Generates the app's data files:
//   public/data/guides.json      - example guide spacers with an example activity score
//   public/data/references.json  - RNAs whose real shape is known (the "answer key")
//
// NOTE ON THE GUIDE DATA: the activity numbers here are EXAMPLE (synthetic) values,
// generated from simple sequence features plus noise. They are for demonstrating the
// tool, not real lab measurements. To use real data, replace guides.json with the
// public Doench et al. (2016) guide-activity set (see scripts/README).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "public", "data");
mkdirSync(dataDir, { recursive: true });

// small seeded RNG so the data is the same every time we build
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260701);
const BASES = "ACGT";
const comp = { A: "T", T: "A", G: "C", C: "G" };

function randomSpacer() {
  let s = "";
  for (let i = 0; i < 20; i += 1) s += BASES[Math.floor(rng() * 4)];
  return s;
}
function gc(s) {
  return [...s].filter((b) => b === "G" || b === "C").length / s.length;
}
// The SAME Nussinov fold + seed-openness the web app uses (spacer only), inlined here
// so the example activity depends on the real openness the app will compute.
function canPairRNA(a, b) {
  const p = a + b;
  return p === "AU" || p === "UA" || p === "GC" || p === "CG" || p === "GU" || p === "UG";
}
function seedOpenness(dna) {
  const seq = dna.replace(/T/g, "U");
  const n = seq.length;
  const minLoop = 3;
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  for (let span = minLoop + 1; span < n; span += 1)
    for (let i = 0; i + span < n; i += 1) {
      const j = i + span;
      let best = dp[i][j - 1];
      for (let k = i; k < j - minLoop; k += 1)
        if (canPairRNA(seq[k], seq[j])) {
          const left = k > i ? dp[i][k - 1] : 0;
          best = Math.max(best, left + dp[k + 1][j - 1] + 1);
        }
      dp[i][j] = best;
    }
  const paired = new Set();
  const st = [[0, n - 1]];
  while (st.length) {
    const [i, j] = st.pop();
    if (i >= j) continue;
    if (dp[i][j] === dp[i][j - 1]) {
      st.push([i, j - 1]);
      continue;
    }
    for (let k = i; k < j - minLoop; k += 1)
      if (canPairRNA(seq[k], seq[j])) {
        const left = k > i ? dp[i][k - 1] : 0;
        if (dp[i][j] === left + dp[k + 1][j - 1] + 1) {
          paired.add(k);
          paired.add(j);
          if (k > i) st.push([i, k - 1]);
          st.push([k + 1, j - 1]);
          break;
        }
      }
  }
  const seedStart = Math.max(0, n - 8);
  let open = 0;
  for (let i = seedStart; i < n; i += 1) if (!paired.has(i)) open += 1;
  return open / (n - seedStart);
}

const guides = [];
const target = 44;
while (guides.length < target) {
  const dna = randomSpacer();
  const g = gc(dna);
  if (g < 0.15 || g > 0.9) continue; // skip extreme guides
  // EXAMPLE activity: an open seed is good, sweet-spot GC helps a little, TTTT hurts,
  // and there is real noise on top so the trend is believable, not a perfect line.
  const gcTerm = 1 - Math.min(1, Math.abs(g - 0.55) / 0.45);
  const openTerm = seedOpenness(dna);
  const poly = dna.includes("TTTT") ? 0.2 : 0;
  const noise = (rng() - 0.5) * 0.3;
  let activity = 0.18 + 0.5 * openTerm + 0.18 * gcTerm - poly + noise;
  activity = Math.max(0.02, Math.min(0.98, activity));
  guides.push({
    id: `demo-${guides.length + 1}`,
    spacer: dna,
    gcPercent: Math.round(g * 1000) / 10,
    activity: Math.round(activity * 1000) / 1000,
    source: "example (synthetic)",
  });
}

writeFileSync(join(dataDir, "guides.json"), JSON.stringify(guides, null, 2));

// ---- known reference structures (the answer key) ----
// Each dot-bracket is checked for balance and length before we keep it.
function ok(seq, db) {
  if (seq.length !== db.length) return false;
  let d = 0;
  for (const c of db) {
    if (c === "(") d += 1;
    else if (c === ")") d -= 1;
    if (d < 0) return false;
  }
  return d === 0;
}

// build dot-bracket from a list of base pairs (guarantees correct length + balance)
function fromPairs(len, pairs) {
  const c = Array(len).fill(".");
  for (const [i, j] of pairs) {
    c[i] = "(";
    c[j] = ")";
  }
  return c.join("");
}
// canonical yeast tRNA-Phe cloverleaf pairs (0-based): acceptor + D + anticodon + T stems
const trnaSeq =
  "GCGGAUUUAGCUCAGUUGGGAGAGCGCCAGACUGAAGAUCUGGAGGUCCUGUGUUCGAUCCACAGAAUUCGCACCA";
const trnaPairs = [
  [0, 71], [1, 70], [2, 69], [3, 68], [4, 67], [5, 66], [6, 65],
  [9, 24], [10, 23], [11, 22], [12, 21],
  [26, 42], [27, 41], [28, 40], [29, 39], [30, 38],
  [48, 64], [49, 63], [50, 62], [51, 61], [52, 60],
];

const candidates = [
  {
    id: "hairpin",
    name: "Designed hairpin",
    seq: "GGGGAAAACCCC",
    structure: "((((....))))",
    note: "A simple stem-loop we can check by hand.",
    cite: "textbook example",
  },
  {
    id: "two-hairpin",
    name: "Two small hairpins",
    seq: "GGGAAACCCUUGGGAAACCC",
    structure: "(((...)))..(((...)))",
    note: "Two separate stem-loops side by side.",
    cite: "textbook example",
  },
  {
    id: "trna-phe",
    name: "tRNA-Phe (yeast)",
    seq: trnaSeq,
    structure: fromPairs(trnaSeq.length, trnaPairs),
    note: "A real transfer-RNA. Its cloverleaf shape has been known since the 1970s.",
    cite: "classic tRNA cloverleaf",
  },
];

const references = candidates.filter((r) => ok(r.seq, r.structure));
for (const c of candidates) {
  if (!ok(c.seq, c.structure)) {
    console.warn(`dropped reference "${c.id}" (len ${c.seq.length} vs ${c.structure.length}, or unbalanced)`);
  }
}
writeFileSync(join(dataDir, "references.json"), JSON.stringify(references, null, 2));

console.log(`Wrote ${guides.length} guides and ${references.length} references.`);
