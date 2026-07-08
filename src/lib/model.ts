// Runs the trained guide-efficiency neural network in the browser.
// The weights live in public/data/model.json (made by scripts/train_model.py).
// It is a small 2-layer network, so the forward pass is a few loops — no ML runtime,
// and it works on the static GitHub Pages site.
//
// IMPORTANT: the feature construction here must match scripts/train_model.py exactly:
//   [ 20x4 position one-hot | 19x16 dinucleotide one-hot | GC | seed openness ] = 386.

import { analyzeGuide, gcPercent } from "../engine";

export interface GuideModel {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  contMean: number[];
  contStd: number[];
  meta: {
    hidden: number;
    nfeat: number;
    params: number;
    trainN: number;
    testN: number;
    testSpearman: number;
    testSpearmanNoOpenness: number;
    baselineOpennessSpearman: number;
    baselineGcSpearman: number;
    features: string;
    trainedOn: string;
  };
}

const BASES = "ACGT";
const NFEAT = 386;

export async function loadGuideModel(base: string): Promise<GuideModel | null> {
  try {
    const r = await fetch(`${base}data/model.json`);
    if (!r.ok) return null;
    return (await r.json()) as GuideModel;
  } catch {
    return null;
  }
}

export interface Prediction {
  value: number; // predicted efficiency, 0..1
  openness: number; // the folding feature the model used
}

export function predictEfficiency(model: GuideModel, spacerInput: string): Prediction | null {
  const dna = spacerInput.replace(/\s+/g, "").toUpperCase().replace(/U/g, "T");
  if (!/^[ACGT]+$/.test(dna) || dna.length < 1) return null;

  const openness = analyzeGuide(dna, "nussinov", { withScaffold: true }).seedOpenness;
  const gc = gcPercent(dna) / 100;

  const x = new Array(NFEAT).fill(0);
  for (let p = 0; p < Math.min(20, dna.length); p += 1) {
    const b = BASES.indexOf(dna[p]);
    if (b >= 0) x[p * 4 + b] = 1;
  }
  for (let p = 0; p < Math.min(19, dna.length - 1); p += 1) {
    const b1 = BASES.indexOf(dna[p]);
    const b2 = BASES.indexOf(dna[p + 1]);
    if (b1 >= 0 && b2 >= 0) x[80 + p * 16 + b1 * 4 + b2] = 1;
  }
  x[384] = (gc - model.contMean[0]) / model.contStd[0];
  x[385] = (openness - model.contMean[1]) / model.contStd[1];

  const Hn = model.b1.length;
  const h = new Array(Hn).fill(0);
  for (let k = 0; k < Hn; k += 1) {
    let s = model.b1[k];
    for (let i = 0; i < NFEAT; i += 1) s += x[i] * model.W1[i][k];
    h[k] = Math.max(0, s);
  }
  let z = model.b2[0];
  for (let k = 0; k < Hn; k += 1) z += h[k] * model.W2[k][0];
  return { value: 1 / (1 + Math.exp(-z)), openness };
}
