import { opennessColor } from "../lib/utils";

// A simple horizontal meter for a 0..1 value, e.g. how open the seed is.
export function Gauge({ value, label, goodHigh = true }: { value: number; label: string; goodHigh?: boolean }) {
  const pct = Math.round(value * 100);
  const color = goodHigh ? opennessColor(value) : opennessColor(1 - value);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-mut">{label}</span>
        <span className="font-mono text-lg font-semibold tabular-nums" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
