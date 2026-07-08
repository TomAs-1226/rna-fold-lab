import { describe, it, expect } from "vitest";
import { nussinov } from "./nussinov";
import { zuker } from "./zuker";
import { normalizeRNA, dotBracketToPairs } from "./sequence";
import { analyzeGuide, seedOpenness } from "./accessibility";
import { accuracyVsTruth, agreementPairs } from "./index";

function balanced(s: string): boolean {
  let depth = 0;
  for (const c of s) {
    if (c === "(") depth += 1;
    else if (c === ")") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

describe("sequence utils", () => {
  it("normalizes DNA to RNA and rejects junk", () => {
    expect(normalizeRNA(" gg ttcc ")).toBe("GGUUCC");
    expect(() => normalizeRNA("GGXZ")).toThrow();
  });
});

describe("nussinov", () => {
  it("folds a clean hairpin", () => {
    const r = nussinov("GGGAAACCC");
    expect(r.structure).toBe("(((...)))");
    expect(r.score).toBe(3);
  });
  it("always returns balanced brackets", () => {
    for (const s of ["GGGGAAAUUUUCCCCAAAGGGGUUUUCCCC", "ACGUACGUACGUACGU", "GCGCUUCGGCGC"]) {
      expect(balanced(nussinov(s).structure)).toBe(true);
    }
  });
});

describe("zuker (energy-based)", () => {
  it("gives a stable (negative) energy for a structured hairpin", () => {
    const r = zuker("GGGGAAAACCCC");
    expect(balanced(r.structure)).toBe(true);
    expect(r.energy!).toBeLessThan(0);
  });
  it("gives ~0 energy and no pairs for something that cannot fold", () => {
    const r = zuker("AAAAAAAAAA");
    expect(r.pairs.length).toBe(0);
    expect(r.energy!).toBeLessThanOrEqual(0.01);
  });
  it("is a different algorithm from Nussinov (energy vs pair-count)", () => {
    const seq = "GGGGAAAUUUUCCCCAAAGGGGUUUUCCCC";
    expect(zuker(seq).energy).toBeDefined();
    expect(nussinov(seq).energy).toBeUndefined();
  });
});

describe("accessibility", () => {
  it("measures seed openness", () => {
    // spacer length 8, whole thing unpaired -> fully open
    expect(seedOpenness("........", 8, 8)).toBe(1);
    expect(seedOpenness("((....))", 8, 8)).toBeCloseTo(0.5, 5);
  });
  it("analyzes a guide end to end", () => {
    const a = analyzeGuide("GACGCAUAAAGAUGAGACGC", "zuker");
    expect(a.spacer.length).toBe(20);
    expect(a.seedOpenness).toBeGreaterThanOrEqual(0);
    expect(a.seedOpenness).toBeLessThanOrEqual(1);
  });
});

describe("comparison helpers", () => {
  it("scores a perfect prediction as F1 = 1", () => {
    const s = "(((...)))";
    expect(accuracyVsTruth(s, s).f1).toBe(1);
    expect(agreementPairs(s, s).length).toBe(dotBracketToPairs(s).length);
  });
});
