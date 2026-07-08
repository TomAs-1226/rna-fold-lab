// Tiny statistics helpers for the dataset view.

export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function ranks(v: number[]): number[] {
  const idx = v.map((val, i) => [val, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(v.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
    const avg = (i + j) / 2 + 1; // average rank for ties
    for (let k = i; k <= j; k += 1) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

/** Spearman correlation = Pearson correlation of the ranks. Robust to outliers. */
export function spearman(x: number[], y: number[]): number {
  return pearson(ranks(x), ranks(y));
}

/** Plain-language reading of a correlation coefficient. */
export function describeCorrelation(r: number): string {
  const a = Math.abs(r);
  const strength = a < 0.1 ? "almost no" : a < 0.3 ? "a weak" : a < 0.5 ? "a moderate" : "a strong";
  const dir = r > 0 ? "positive" : "negative";
  if (a < 0.1) return "almost no relationship";
  return `${strength} ${dir} relationship`;
}
