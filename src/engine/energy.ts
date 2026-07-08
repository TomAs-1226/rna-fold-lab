// A SIMPLIFIED energy model for the Zuker folder.
// Real folding programs (like ViennaRNA) use the full Turner parameter set, which
// is measured in a lab and has hundreds of numbers. We use a smaller, plainly
// approximate version so the code stays readable. This is exactly why we compare
// our results against ViennaRNA — to see how close a simple model gets.
// Rule of thumb: stacks of pairs are stabilizing (negative), loops cost energy (positive).

const PAIR_INDEX: Record<string, number> = { AU: 0, UA: 1, GC: 2, CG: 3, GU: 4, UG: 5 };

// Energy (kcal/mol) of one pair sitting directly on top of another pair.
// Order of rows/cols: AU, UA, GC, CG, GU, UG. G-C stacks are the strongest.
const STACK: number[][] = [
  [-0.9, -1.1, -2.2, -2.1, -0.6, -1.4],
  [-1.3, -0.9, -2.4, -2.2, -1.0, -0.8],
  [-2.1, -2.4, -3.4, -3.3, -1.5, -2.1],
  [-2.2, -2.1, -3.3, -2.9, -1.4, -1.9],
  [-0.6, -1.0, -1.5, -1.4, -0.5, -0.5],
  [-1.4, -0.8, -2.1, -1.9, -0.5, -0.5],
];

/** Energy for pair (a,b) stacked directly on the inner pair (c,d). */
export function stackEnergy(a: string, b: string, c: string, d: string): number {
  const o = PAIR_INDEX[`${a}${b}`];
  const i = PAIR_INDEX[`${c}${d}`];
  if (o === undefined || i === undefined) return 0;
  return STACK[o][i];
}

/** Cost of a hairpin loop with `size` unpaired bases inside it. */
export function hairpinEnergy(size: number): number {
  if (size < 3) return Infinity; // a loop needs at least 3 free bases
  const table: Record<number, number> = { 3: 5.4, 4: 5.0, 5: 4.4, 6: 4.3, 7: 4.5, 8: 4.9 };
  if (table[size] !== undefined) return table[size];
  return 4.9 + 1.75 * Math.log(size / 8);
}

/** Cost of a bulge / internal loop with `unpaired` total unpaired bases. */
export function internalEnergy(unpaired: number): number {
  if (unpaired <= 0) return 0;
  if (unpaired === 1) return 3.8; // a single-base bulge
  return 1.7 + 1.25 * Math.log(unpaired);
}

// Multiloop cost, in the standard affine form:
//   total = ML_INIT (for opening the multiloop) + ML_BRANCH per stem + ML_UNPAIRED per free base.
// These let the Zuker folder build junctions like the tRNA cloverleaf.
export const ML_INIT = 3.4;
export const ML_BRANCH = 0.4;
export const ML_UNPAIRED = 0.0;
