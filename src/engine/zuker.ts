// Zuker-style folder: the SECOND of our two folders, and the one that works
// differently from Nussinov on purpose. Instead of counting pairs, it finds the
// MOST STABLE shape — lowest total free energy. Because the two folders use
// different rules, when they agree it is real evidence, not a copy.
//
// Three grids:
//   V[i][j] = best energy of i..j WHEN i and j are a pair
//   M[i][j] = best energy of i..j as a piece of a multiloop (has at least one stem)
//   W[i][j] = best energy of i..j overall (i and j may or may not pair)
// The M grid is what lets it build junctions where several stems meet (like a tRNA
// cloverleaf), scored with the affine multiloop rule in energy.ts.

import { canPair, pairsToDotBracket, normalizeRNA, type Pair } from "./sequence";
import { stackEnergy, hairpinEnergy, internalEnergy, ML_INIT, ML_BRANCH, ML_UNPAIRED } from "./energy";
import type { FoldResult } from "./nussinov";

const MAXLOOP = 30; // biggest internal/bulge loop we consider (keeps it fast)

type VBack = null | { t: "hairpin" } | { t: "stack" } | { t: "internal"; p: number; q: number } | { t: "multi"; k: number };
type MBack = null | { t: "v" } | { t: "iu" } | { t: "ju" } | { t: "split"; k: number };
type WBack = null | { t: "i" } | { t: "j" } | { t: "v" } | { t: "split"; k: number };

export function zuker(
  input: string,
  { minLoop = 3, allowWobble = true }: { minLoop?: number; allowWobble?: boolean } = {},
): FoldResult {
  const seq = normalizeRNA(input);
  const n = seq.length;
  const INF = Infinity;

  const V: number[][] = Array.from({ length: n }, () => Array(n).fill(INF));
  const M: number[][] = Array.from({ length: n }, () => Array(n).fill(INF));
  const W: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const Vb: VBack[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const Mb: MBack[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const Wb: WBack[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const pairable = (i: number, j: number) => canPair(seq[i], seq[j], allowWobble);

  for (let span = 1; span < n; span += 1) {
    for (let i = 0; i + span < n; i += 1) {
      const j = i + span;

      // ---- V[i][j]: best energy when i and j pair ----
      if (j - i > minLoop && pairable(i, j)) {
        let best = INF;
        let back: VBack = null;

        const hair = hairpinEnergy(j - i - 1);
        if (hair < best) { best = hair; back = { t: "hairpin" }; }

        if (pairable(i + 1, j - 1) && V[i + 1][j - 1] < INF) {
          const e = stackEnergy(seq[i], seq[j], seq[i + 1], seq[j - 1]) + V[i + 1][j - 1];
          if (e < best) { best = e; back = { t: "stack" }; }
        }

        for (let p = i + 1; p <= Math.min(i + MAXLOOP, j - 2); p += 1) {
          for (let q = Math.max(p + 1, j - MAXLOOP); q < j; q += 1) {
            const unpaired = p - i - 1 + (j - q - 1);
            if (unpaired < 1 || unpaired > MAXLOOP) continue;
            if (q - p <= minLoop || !pairable(p, q) || V[p][q] >= INF) continue;
            const e = internalEnergy(unpaired) + V[p][q];
            if (e < best) { best = e; back = { t: "internal", p, q }; }
          }
        }

        // multiloop closed by (i,j): interior i+1..j-1 splits into two multiloop
        // pieces, each with at least one stem (so the junction has >= 2 stems)
        for (let k = i + 2; k <= j - 2; k += 1) {
          if (M[i + 1][k] < INF && M[k + 1][j - 1] < INF) {
            const e = ML_INIT + M[i + 1][k] + M[k + 1][j - 1];
            if (e < best) { best = e; back = { t: "multi", k }; }
          }
        }

        V[i][j] = best;
        Vb[i][j] = back;
      }

      // ---- M[i][j]: best energy as a multiloop piece (>= 1 stem) ----
      {
        let best = INF;
        let back: MBack = null;
        if (V[i][j] < INF) { const e = V[i][j] + ML_BRANCH; if (e < best) { best = e; back = { t: "v" }; } }
        if (M[i + 1]?.[j] < INF) { const e = M[i + 1][j] + ML_UNPAIRED; if (e < best) { best = e; back = { t: "iu" }; } }
        if (M[i]?.[j - 1] < INF) { const e = M[i][j - 1] + ML_UNPAIRED; if (e < best) { best = e; back = { t: "ju" }; } }
        for (let k = i; k < j; k += 1) {
          if (M[i][k] < INF && M[k + 1][j] < INF) {
            const e = M[i][k] + M[k + 1][j];
            if (e < best) { best = e; back = { t: "split", k }; }
          }
        }
        M[i][j] = best;
        Mb[i][j] = back;
      }

      // ---- W[i][j]: best energy overall ----
      let bestW = 0;
      let wback: WBack = null;
      if ((W[i + 1]?.[j] ?? 0) < bestW) { bestW = W[i + 1][j]; wback = { t: "i" }; }
      if ((W[i]?.[j - 1] ?? 0) < bestW) { bestW = W[i][j - 1]; wback = { t: "j" }; }
      if (V[i][j] < bestW) { bestW = V[i][j]; wback = { t: "v" }; }
      for (let k = i; k < j; k += 1) {
        const e = W[i][k] + W[k + 1][j];
        if (e < bestW) { bestW = e; wback = { t: "split", k }; }
      }
      W[i][j] = bestW;
      Wb[i][j] = wback;
    }
  }

  // ---- read the shape back out ----
  const pairs: Pair[] = [];
  type Cell = { i: number; j: number; mat: "W" | "V" | "M" };
  const stack: Cell[] = n > 0 ? [{ i: 0, j: n - 1, mat: "W" }] : [];

  while (stack.length) {
    const { i, j, mat } = stack.pop()!;
    if (i < 0 || i > j) continue;

    if (mat === "W") {
      const bp = Wb[i][j];
      if (!bp) continue;
      if (bp.t === "i") stack.push({ i: i + 1, j, mat: "W" });
      else if (bp.t === "j") stack.push({ i, j: j - 1, mat: "W" });
      else if (bp.t === "v") stack.push({ i, j, mat: "V" });
      else stack.push({ i, j: bp.k, mat: "W" }, { i: bp.k + 1, j, mat: "W" });
    } else if (mat === "V") {
      if (i >= j) continue;
      pairs.push([i, j]);
      const bp = Vb[i][j];
      if (!bp || bp.t === "hairpin") continue;
      if (bp.t === "stack") stack.push({ i: i + 1, j: j - 1, mat: "V" });
      else if (bp.t === "internal") stack.push({ i: bp.p, j: bp.q, mat: "V" });
      else stack.push({ i: i + 1, j: bp.k, mat: "M" }, { i: bp.k + 1, j: j - 1, mat: "M" });
    } else {
      const bp = Mb[i][j];
      if (!bp) continue;
      if (bp.t === "v") stack.push({ i, j, mat: "V" });
      else if (bp.t === "iu") stack.push({ i: i + 1, j, mat: "M" });
      else if (bp.t === "ju") stack.push({ i, j: j - 1, mat: "M" });
      else stack.push({ i, j: bp.k, mat: "M" }, { i: bp.k + 1, j, mat: "M" });
    }
  }

  pairs.sort((a, b) => a[0] - b[0]);
  const energy = n > 0 ? W[0][n - 1] : 0;
  return {
    sequence: seq,
    algorithm: "zuker",
    structure: pairsToDotBracket(n, pairs),
    pairs,
    score: pairs.length,
    energy: Number(energy.toFixed(2)),
    dp: V.map((row) => row.map((v) => (v === INF ? 0 : v))),
  };
}
