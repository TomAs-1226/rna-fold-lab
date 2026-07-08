import { type Pair } from "../engine";

// Draws the sequence along a line with an arc for every base pair.
// Seed bases (the guide's DNA-grabbing end) are drawn in amber.
export function ArcDiagram({
  sequence,
  pairs,
  seedStart,
  className,
}: {
  sequence: string;
  pairs: Pair[];
  seedStart?: number;
  className?: string;
}) {
  const n = sequence.length;
  if (!n) return <div className="text-sm text-mut">Nothing to draw yet.</div>;

  const step = n > 60 ? 16 : 26;
  const pad = 18;
  const baseline = 118;
  const width = pad * 2 + (n - 1) * step;
  const r = n > 60 ? 6 : 9;

  return (
    <div className={`overflow-x-auto ${className ?? ""}`}>
      <svg
        width={width}
        height={150}
        viewBox={`0 0 ${width} 150`}
        role="img"
        aria-label={`Arc diagram of ${pairs.length} base pairs across ${n} bases`}
        className="block"
      >
        {/* backbone */}
        <line x1={pad} y1={baseline} x2={width - pad} y2={baseline} stroke="#22304B" strokeWidth={2} />
        {/* arcs */}
        {pairs.map(([i, j], idx) => {
          const x1 = pad + i * step;
          const x2 = pad + j * step;
          const h = Math.min(96, 20 + (x2 - x1) * 0.42);
          return (
            <path
              key={idx}
              d={`M ${x1} ${baseline - r} C ${x1} ${baseline - h}, ${x2} ${baseline - h}, ${x2} ${baseline - r}`}
              fill="none"
              stroke="#2DD4BF"
              strokeWidth={1.75}
              opacity={0.85}
            />
          );
        })}
        {/* bases */}
        {[...sequence].map((base, i) => {
          const x = pad + i * step;
          const isSeed = seedStart !== undefined && i >= seedStart;
          return (
            <g key={i}>
              <circle cx={x} cy={baseline} r={r} fill={isSeed ? "#F5B056" : "#16233D"} stroke={isSeed ? "#F5B056" : "#2A3A57"} strokeWidth={1.5} />
              {n <= 90 ? (
                <text x={x} y={baseline + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={n > 60 ? 8 : 10} fontFamily="'JetBrains Mono', monospace" fill={isSeed ? "#0B1220" : "#93A4BE"} fontWeight={600}>
                  {base}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
