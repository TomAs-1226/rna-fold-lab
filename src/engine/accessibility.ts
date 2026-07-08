// Turns a fold into the numbers the CRISPR side of the project cares about:
// mainly "how open is the seed?" — the part of the guide that grabs the DNA.

import {
  normalizeRNA,
  gcPercent,
  SEED_LENGTH,
  SGRNA_SCAFFOLD,
  dotBracketToPairs,
} from "./sequence";
import { nussinov, type FoldResult } from "./nussinov";
import { zuker } from "./zuker";

export type Algo = "nussinov" | "zuker";

/** Fold a sequence with whichever algorithm you pick. */
export function fold(
  seq: string,
  algo: Algo,
  opts?: { minLoop?: number; allowWobble?: boolean },
): FoldResult {
  return algo === "zuker" ? zuker(seq, opts) : nussinov(seq, opts);
}

export interface GuideAnalysis {
  spacer: string;
  full: string;
  algorithm: Algo;
  structure: string;
  spacerStructure: string;
  energy?: number;
  /** 1 = seed fully open (good), 0 = seed fully folded up (bad) */
  seedOpenness: number;
  gcPercent: number;
  selfPairFraction: number;
  warnings: string[];
}

/** Fraction of the seed bases (the last few letters of the spacer) that are unpaired. */
export function seedOpenness(structure: string, spacerLen: number, seedLen = SEED_LENGTH): number {
  const start = Math.max(0, spacerLen - seedLen);
  const seed = structure.slice(start, spacerLen);
  if (!seed.length) return 0;
  const open = [...seed].filter((c) => c === ".").length;
  return open / seed.length;
}

/** Full analysis of one guide spacer. By default it folds the whole guide (spacer + scaffold). */
export function analyzeGuide(
  spacerInput: string,
  algo: Algo = "zuker",
  opts?: { withScaffold?: boolean },
): GuideAnalysis {
  const spacer = normalizeRNA(spacerInput);
  const withScaffold = opts?.withScaffold ?? true;
  const full = withScaffold ? spacer + SGRNA_SCAFFOLD : spacer;
  const f = fold(full, algo);
  const spacerStructure = f.structure.slice(0, spacer.length);
  const open = seedOpenness(f.structure, spacer.length);
  const pairsInSpacer = dotBracketToPairs(spacerStructure).length;
  const selfPair = spacer.length ? (2 * pairsInSpacer) / spacer.length : 0;
  const gc = gcPercent(spacer);

  const warnings: string[] = [];
  if (spacer.length !== 20) warnings.push("not 20 letters long");
  if (gc < 30) warnings.push("low G/C (under 30%)");
  if (gc > 75) warnings.push("high G/C (over 75%)");
  if (spacer.replace(/U/g, "T").includes("TTTT")) warnings.push("has a TTTT run");
  if (open < 0.5) warnings.push("seed is mostly folded up");

  return {
    spacer,
    full,
    algorithm: algo,
    structure: f.structure,
    spacerStructure,
    energy: f.energy,
    seedOpenness: open,
    gcPercent: gc,
    selfPairFraction: selfPair,
    warnings,
  };
}
