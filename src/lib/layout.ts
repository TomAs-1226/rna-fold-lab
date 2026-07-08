import type { Pair } from "../engine";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// deterministic pseudo-random so the layout is the same every render
function seeded(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

// A small force-directed (spring) layout. The backbone and the base pairs act like
// springs; every base pushes every other base apart. After a few hundred steps the
// strand settles into a shape with visible loops and stems — and it fits any length
// into a fixed box, so nothing needs to scroll. dim=2 for flat, dim=3 for a 3D shape.
export function layoutStructure(n: number, pairs: Pair[], dim: 2 | 3, iters = 320): Vec3[] {
  if (n === 0) return [];
  const pos: Vec3[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    pos.push({
      x: Math.cos(a) * n * 0.15 + (seeded(i) - 0.5) * 2,
      y: Math.sin(a) * n * 0.15 + (seeded(i + n) - 0.5) * 2,
      z: dim === 3 ? (seeded(i + 2 * n) - 0.5) * n * 0.15 : 0,
    });
  }
  const L = 12; // rest length between neighbours
  const springs: Array<readonly [number, number, number]> = [];
  for (let i = 0; i < n - 1; i += 1) springs.push([i, i + 1, L]);
  for (const [a, b] of pairs) springs.push([a, b, L * 0.85]);

  let temp = 1;
  for (let it = 0; it < iters; it += 1) {
    const disp = pos.map(() => ({ x: 0, y: 0, z: 0 }));
    // repulsion between every pair of bases
    for (let i = 0; i < n; i += 1)
      for (let j = i + 1; j < n; j += 1) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        let dz = pos[i].z - pos[j].z;
        const d2 = dx * dx + dy * dy + dz * dz + 0.01;
        const d = Math.sqrt(d2);
        const rep = (L * L * 2) / d2;
        dx = (dx / d) * rep;
        dy = (dy / d) * rep;
        dz = (dz / d) * rep;
        disp[i].x += dx; disp[i].y += dy; disp[i].z += dz;
        disp[j].x -= dx; disp[j].y -= dy; disp[j].z -= dz;
      }
    // spring attraction along the backbone and base pairs
    for (const [a, b, rest] of springs) {
      const dx = pos[b].x - pos[a].x;
      const dy = pos[b].y - pos[a].y;
      const dz = pos[b].z - pos[a].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const f = ((d - rest) / d) * 0.3;
      disp[a].x += dx * f; disp[a].y += dy * f; disp[a].z += dz * f;
      disp[b].x -= dx * f; disp[b].y -= dy * f; disp[b].z -= dz * f;
    }
    const maxStep = L * temp * 2;
    for (let i = 0; i < n; i += 1) {
      const dl = Math.sqrt(disp[i].x ** 2 + disp[i].y ** 2 + disp[i].z ** 2) + 0.0001;
      const s = Math.min(dl, maxStep) / dl;
      pos[i].x += disp[i].x * s;
      pos[i].y += disp[i].y * s;
      if (dim === 3) pos[i].z += disp[i].z * s;
    }
    temp *= 0.985;
  }
  return pos;
}

// Scale/center a layout into a `size`-wide box (for the 2D SVG).
export function fitToBox(pos: Vec3[], size = 100, pad = 8): Vec3[] {
  if (!pos.length) return pos;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pos) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = (size - 2 * pad) / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return pos.map((p) => ({ x: (p.x - cx) * scale + size / 2, y: (p.y - cy) * scale + size / 2, z: p.z * scale }));
}
