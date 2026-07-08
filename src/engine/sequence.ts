// Small helpers shared by both folding algorithms.
// An RNA is a string of A, C, G, U. Bases pair up: A-U, G-C, and the weaker G-U.

export type Pair = [number, number];

// The seed is the end of the guide that grabs the DNA first (nearest the PAM).
export const SEED_LENGTH = 8;

// The fixed tail every real SpCas9 guide carries after its 20-letter targeting part.
export const SGRNA_SCAFFOLD =
  "GUUUUAGAGCUAGAAAUAGCAAGUUAAAAUAAGGCUAGUCCGUUAUCAACUUGAAAAAGUGGCACCGAGUCGGUGC";

const CANONICAL = new Set(["AU", "UA", "GC", "CG"]);
const WOBBLE = new Set(["GU", "UG"]);

/** Clean up user input: remove spaces, upper-case, turn DNA's T into RNA's U, and reject anything else. */
export function normalizeRNA(input: string): string {
  const seq = input.replace(/\s+/g, "").toUpperCase().replace(/T/g, "U");
  const bad = [...new Set(seq.replace(/[ACGU]/g, ""))];
  if (bad.length) {
    throw new Error(`Only A, C, G, U (and T) are allowed. Found: ${bad.join(", ")}`);
  }
  return seq;
}

/** Can these two letters stick together? */
export function canPair(a: string, b: string, allowWobble = true): boolean {
  const p = `${a}${b}`;
  return CANONICAL.has(p) || (allowWobble && WOBBLE.has(p));
}

/** Turn a list of pairs into dot-bracket text, e.g. (((...))). */
export function pairsToDotBracket(n: number, pairs: Pair[]): string {
  const chars = Array(n).fill(".");
  for (const [i, j] of pairs) {
    chars[i] = "(";
    chars[j] = ")";
  }
  return chars.join("");
}

/** Turn dot-bracket text back into a list of pairs. */
export function dotBracketToPairs(s: string): Pair[] {
  const stack: number[] = [];
  const out: Pair[] = [];
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "(") stack.push(i);
    else if (s[i] === ")") {
      const j = stack.pop();
      if (j !== undefined) out.push([j, i]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** Percent of the sequence that is G or C. */
export function gcPercent(seq: string): number {
  if (!seq.length) return 0;
  const gc = [...seq].filter((b) => b === "G" || b === "C").length;
  return (gc / seq.length) * 100;
}
