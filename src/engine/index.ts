export * from "./sequence";
export * from "./nussinov";
export * from "./zuker";
export * from "./energy";
export * from "./accessibility";

import { dotBracketToPairs, type Pair } from "./sequence";

/** How many base pairs two folds agree on — used to compare our two algorithms. */
export function agreementPairs(structureA: string, structureB: string): Pair[] {
  const a = new Set(dotBracketToPairs(structureA).map(([i, j]) => `${i}-${j}`));
  const shared: Pair[] = [];
  for (const [i, j] of dotBracketToPairs(structureB)) {
    if (a.has(`${i}-${j}`)) shared.push([i, j]);
  }
  return shared;
}

/** Precision/recall style scores of a predicted structure against a known-true one. */
export function accuracyVsTruth(predicted: string, truth: string) {
  const pred = new Set(dotBracketToPairs(predicted).map(([i, j]) => `${i}-${j}`));
  const real = new Set(dotBracketToPairs(truth).map(([i, j]) => `${i}-${j}`));
  let tp = 0;
  for (const p of pred) if (real.has(p)) tp += 1;
  const sensitivity = real.size ? tp / real.size : 0;
  const precision = pred.size ? tp / pred.size : 0;
  const f1 = sensitivity + precision ? (2 * sensitivity * precision) / (sensitivity + precision) : 0;
  return { truePairs: real.size, predictedPairs: pred.size, correct: tp, sensitivity, precision, f1 };
}
