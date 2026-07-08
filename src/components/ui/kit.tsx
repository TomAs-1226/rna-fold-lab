import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn("rounded-2xl border border-line bg-surface shadow-glow", className)}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, sub, icon }: { title: string; sub?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-5 pb-0">
      {icon ? <div className="mt-0.5 text-teal">{icon}</div> : null}
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {sub ? <p className="mt-0.5 text-sm text-mut">{sub}</p> : null}
      </div>
    </div>
  );
}

export function Button({
  className,
  variant = "solid",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" | "outline" }) {
  const styles = {
    solid: "bg-teal text-bg hover:bg-tealdim font-semibold",
    ghost: "text-mut hover:text-ink hover:bg-surface2",
    outline: "border border-line text-ink hover:border-teal/60 hover:text-teal",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm",
        "transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/70",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "mut" }: { children: ReactNode; tone?: "teal" | "amber" | "danger" | "good" | "mut" | "indigo" }) {
  const tones: Record<string, string> = {
    teal: "bg-teal/15 text-teal border-teal/30",
    amber: "bg-amber/15 text-amber border-amber/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    good: "bg-good/15 text-good border-good/30",
    indigo: "bg-indigo/15 text-indigo border-indigo/30",
    mut: "bg-surface2 text-mut border-line",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface2/60 p-3">
      <div className="text-xs uppercase tracking-wide text-mut">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-mut">{hint}</div> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface2/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            value === o.value ? "bg-teal text-bg" : "text-mut hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A short, plain-language explanation block. Used all over so nothing is jargon-only. */
export function Note({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "amber" | "indigo" }) {
  const bar = { teal: "border-teal/50", amber: "border-amber/50", indigo: "border-indigo/50" }[tone];
  return (
    <div className={cn("rounded-lg border-l-2 bg-surface2/40 px-3 py-2 text-sm text-mut", bar)}>{children}</div>
  );
}
