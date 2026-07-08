import { useMemo } from "react";
import type { Pair } from "../engine";
import { layoutStructure, fitToBox } from "../lib/layout";

// A flat, spring-laid-out drawing of the fold. It fits any length into a square box,
// so it never needs horizontal scrolling. Seed bases are amber.
export function StructureView2D({
  sequence,
  pairs,
  seedStart,
}: {
  sequence: string;
  pairs: Pair[];
  seedStart?: number;
}) {
  const n = sequence.length;
  const pos = useMemo(() => fitToBox(layoutStructure(n, pairs, 2), 100, 8), [sequence, pairs, n]);
  if (!n) return <div className="text-sm text-mut">Nothing to draw yet.</div>;
  const r = n > 70 ? 1.1 : n > 40 ? 1.5 : 2.1;

  return (
    <svg viewBox="0 0 100 100" className="aspect-square w-full max-w-[420px] mx-auto" role="img" aria-label={`Folded shape with ${pairs.length} base pairs`}>
      {/* backbone */}
      {pos.slice(0, -1).map((p, i) => (
        <line key={`b${i}`} x1={p.x} y1={p.y} x2={pos[i + 1].x} y2={pos[i + 1].y} stroke="#3A4A66" strokeWidth={0.9} strokeLinecap="round" />
      ))}
      {/* base pairs */}
      {pairs.map(([i, j], k) => (
        <line key={`p${k}`} x1={pos[i].x} y1={pos[i].y} x2={pos[j].x} y2={pos[j].y} stroke="#2DD4BF" strokeWidth={0.8} opacity={0.85} />
      ))}
      {/* bases */}
      {pos.map((p, i) => {
        const isSeed = seedStart !== undefined && i >= seedStart;
        return <circle key={i} cx={p.x} cy={p.y} r={r} fill={isSeed ? "#F5B056" : "#1B2A45"} stroke={isSeed ? "#F5B056" : "#33456A"} strokeWidth={0.5} />;
      })}
      {/* mark the 5' start */}
      {pos.length ? <circle cx={pos[0].x} cy={pos[0].y} r={r + 0.8} fill="none" stroke="#818CF8" strokeWidth={0.7} /> : null}
    </svg>
  );
}
