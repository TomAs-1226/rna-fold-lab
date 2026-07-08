import { useEffect, useRef } from "react";

// The grid the algorithm fills in, drawn as a heatmap. Brighter = a better score
// for that stretch of the sequence. This is the "dynamic programming table."
export function DPMatrix({ dp, kind }: { dp?: number[][]; kind: "nussinov" | "zuker" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !dp || !dp.length) return;
    const n = dp.length;
    const ctx = canvas.getContext("2d")!;
    const size = 300;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, size, size);
    const cell = size / n;

    // find range of values in the upper triangle
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i += 1)
      for (let j = i; j < n; j += 1) {
        lo = Math.min(lo, dp[i][j]);
        hi = Math.max(hi, dp[i][j]);
      }
    // Nussinov: high count = bright. Zuker: low (negative) energy = bright.
    const norm = (v: number) => {
      if (hi === lo) return 0;
      const t = (v - lo) / (hi - lo);
      return kind === "zuker" ? 1 - t : t;
    };

    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (j < i) {
          ctx.fillStyle = "#0B1220";
        } else {
          const t = norm(dp[i][j]);
          const rr = Math.round(11 + t * 34);
          const gg = Math.round(28 + t * 184);
          const bb = Math.round(43 + t * 148);
          ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
        }
        ctx.fillRect(j * cell, i * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }, [dp, kind]);

  if (!dp || !dp.length) return null;
  return <canvas ref={ref} style={{ width: 300, height: 300 }} className="max-w-full rounded-lg border border-line" aria-label="Dynamic programming grid heatmap" />;
}
