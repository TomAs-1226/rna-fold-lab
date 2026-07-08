// Nussinov algorithm: the FIRST of our two folders.
// Its rule is simple: out of every way the strand could fold, pick the one with
// the MOST base pairs (pairs are not allowed to cross). It fills a grid, then
// reads the answer back out.

import { canPair, pairsToDotBracket, normalizeRNA, type Pair } from "./sequence";

export interface FoldResult {
  sequence: string;
  algorithm: "nussinov" | "zuker";
  /** dots-and-brackets, e.g. (((...))) */
  structure: string;
  pairs: Pair[];
  /** number of base pairs found */
  score: number;
  /** free energy in kcal/mol — only the Zuker folder reports this */
  energy?: number;
  /** the filled grid, used to draw the heatmap */
  dp?: number[][];
}

export function nussinov(
  input: string,
  { minLoop = 3, allowWobble = true }: { minLoop?: number; allowWobble?: boolean } = {},
): FoldResult {
  const seq = normalizeRNA(input);
  const n = seq.length;
  const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Fill the grid from short stretches to long ones.
  // dp[i][j] = the most base pairs possible in the stretch from i to j.
  for (let span = minLoop + 1; span < n; span += 1) {
    for (let i = 0; i + span < n; i += 1) {
      const j = i + span;
      let best = dp[i][j - 1]; // option: leave j unpaired
      for (let k = i; k < j - minLoop; k += 1) {
        // option: pair j with some earlier base k
        if (canPair(seq[k], seq[j], allowWobble)) {
          const left = k > i ? dp[i][k - 1] : 0;
          best = Math.max(best, left + dp[k + 1][j - 1] + 1);
        }
      }
      dp[i][j] = best;
    }
  }

  // Walk back through the grid to recover which pairs were chosen.
  const pairs: Pair[] = [];
  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    if (i >= j) continue;
    if (dp[i][j] === dp[i][j - 1]) {
      stack.push([i, j - 1]);
      continue;
    }
    for (let k = i; k < j - minLoop; k += 1) {
      if (canPair(seq[k], seq[j], allowWobble)) {
        const left = k > i ? dp[i][k - 1] : 0;
        if (dp[i][j] === left + dp[k + 1][j - 1] + 1) {
          pairs.push([k, j]);
          if (k > i) stack.push([i, k - 1]);
          stack.push([k + 1, j - 1]);
          break;
        }
      }
    }
  }

  pairs.sort((a, b) => a[0] - b[0]);
  return {
    sequence: seq,
    algorithm: "nussinov",
    structure: pairsToDotBracket(n, pairs),
    pairs,
    score: n > 0 ? dp[0][n - 1] : 0,
    dp,
  };
}
