// Zuker-style folder: the SECOND of our two folders, and the one that works
// differently from Nussinov on purpose. Instead of counting pairs, it looks for
// the MOST STABLE shape — the one with the lowest total free energy. Because the
// two folders use different rules, when they agree it is real evidence, not a copy.
//
// It fills two grids:
//   V[i][j] = best energy of i..j WHEN i and j are a pair
//   W[i][j] = best energy of i..j (i and j may or may not pair)
// This is a simplified version (no separate multiloop cost); branching happens at
// the W level, which keeps the code short and readable.

import { canPair, pairsToDotBracket, normalizeRNA, type Pair } from "./sequence";
import { stackEnergy, hairpinEnergy, internalEnergy } from "./energy";
import type { FoldResult } from "./nussinov";

const MAXLOOP = 30; // biggest internal/bulge loop we consider (keeps it fast)

type VBack = null | { t: "hairpin" } | { t: "stack" } | { t: "internal"; p: number; q: number };
type WBack = null | { t: "i" } | { t: "j" } | { t: "v" } | { t: "split"; k: number };

export function zuker(
  input: string,
  { minLoop = 3, allowWobble = true }: { minLoop?: number; allowWobble?: boolean } = {},
): FoldResult {
  const seq = normalizeRNA(input);
  const n = seq.length;
  const INF = Infinity;

  const V: number[][] = Array.from({ length: n }, () => Array(n).fill(INF));
  const W: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const Vb: VBack[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const Wb: WBack[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const pairable = (i: number, j: number) => canPair(seq[i], seq[j], allowWobble);

  for (let span = 1; span < n; span += 1) {
    for (let i = 0; i + span < n; i += 1) {
      const j = i + span;

      // ---- V[i][j]: the best energy when i and j pair ----
      if (j - i > minLoop && pairable(i, j)) {
        let best = INF;
        let back: VBack = null;

        const hair = hairpinEnergy(j - i - 1); // i,j close a hairpin
        if (hair < best) {
          best = hair;
          back = { t: "hairpin" };
        }

        if (pairable(i + 1, j - 1) && V[i + 1][j - 1] < INF) {
          const e = stackEnergy(seq[i], seq[j], seq[i + 1], seq[j - 1]) + V[i + 1][j - 1];
          if (e < best) {
            best = e;
            back = { t: "stack" };
          }
        }

        // internal / bulge loops (bounded so it stays fast)
        for (let p = i + 1; p <= Math.min(i + MAXLOOP, j - 2); p += 1) {
          for (let q = Math.max(p + 1, j - MAXLOOP); q < j; q += 1) {
            const unpaired = p - i - 1 + (j - q - 1);
            if (unpaired < 1 || unpaired > MAXLOOP) continue;
            if (q - p <= minLoop || !pairable(p, q) || V[p][q] >= INF) continue;
            const e = internalEnergy(unpaired) + V[p][q];
            if (e < best) {
              best = e;
              back = { t: "internal", p, q };
            }
          }
        }

        V[i][j] = best;
        Vb[i][j] = back;
      }

      // ---- W[i][j]: the best energy overall for i..j ----
      let bestW = 0; // all-unpaired always costs 0
      let wback: WBack = null;
      if ((W[i + 1]?.[j] ?? 0) < bestW) {
        bestW = W[i + 1][j];
        wback = { t: "i" };
      }
      if ((W[i]?.[j - 1] ?? 0) < bestW) {
        bestW = W[i][j - 1];
        wback = { t: "j" };
      }
      if (V[i][j] < bestW) {
        bestW = V[i][j];
        wback = { t: "v" };
      }
      for (let k = i; k < j; k += 1) {
        const e = W[i][k] + W[k + 1][j];
        if (e < bestW) {
          bestW = e;
          wback = { t: "split", k };
        }
      }
      W[i][j] = bestW;
      Wb[i][j] = wback;
    }
  }

  // ---- read the shape back out ----
  const pairs: Pair[] = [];
  const wStack: Array<[number, number]> = n > 0 ? [[0, n - 1]] : [];
  const vStack: Array<[number, number]> = [];

  const walkV = (i0: number, j0: number) => {
    let a = i0;
    let b = j0;
    // V has no branching in this model, so it is a single chain ending in a hairpin.
    while (a < b) {
      pairs.push([a, b]);
      const back = Vb[a][b];
      if (!back || back.t === "hairpin") break;
      if (back.t === "stack") {
        a += 1;
        b -= 1;
        continue;
      }
      a = back.p;
      b = back.q;
    }
  };

  while (wStack.length || vStack.length) {
    if (wStack.length) {
      const [i, j] = wStack.pop()!;
      if (i >= j || i < 0) continue;
      const back = Wb[i][j];
      if (!back) continue; // this stretch is all unpaired
      if (back.t === "i") wStack.push([i + 1, j]);
      else if (back.t === "j") wStack.push([i, j - 1]);
      else if (back.t === "v") vStack.push([i, j]);
      else wStack.push([i, back.k], [back.k + 1, j]);
    } else {
      const [i, j] = vStack.pop()!;
      walkV(i, j);
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
