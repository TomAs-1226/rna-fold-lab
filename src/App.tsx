import { useState } from "react";
import { FoldLab } from "./views/FoldLab";
import { GuideAnalyzer } from "./views/GuideAnalyzer";
import { Designer } from "./views/Designer";
import { Dataset } from "./views/Dataset";
import { Validate } from "./views/Validate";
import { Learn } from "./views/Learn";
import { cn } from "./lib/utils";
import { FlaskConical, Target, Crosshair, ScatterChart, ShieldCheck, BookOpen, Dna } from "lucide-react";

const NAV = [
  { id: "fold", label: "Fold Lab", icon: FlaskConical },
  { id: "guide", label: "Guide Analyzer", icon: Target },
  { id: "design", label: "Designer", icon: Crosshair },
  { id: "data", label: "Dataset", icon: ScatterChart },
  { id: "check", label: "Check our work", icon: ShieldCheck },
  { id: "learn", label: "Learn", icon: BookOpen },
] as const;

export default function App() {
  const [active, setActive] = useState<(typeof NAV)[number]["id"]>("fold");
  const [pendingSpacer, setPendingSpacer] = useState<string>();
  const openGuide = (spacer: string) => {
    setPendingSpacer(spacer);
    setActive("guide");
  };

  const view = () => {
    switch (active) {
      case "guide":
        return <GuideAnalyzer initialSpacer={pendingSpacer} />;
      case "design":
        return <Designer onOpen={openGuide} />;
      case "data":
        return <Dataset />;
      case "check":
        return <Validate />;
      case "learn":
        return <Learn />;
      default:
        return <FoldLab />;
    }
  };

  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/40 p-5 lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavButton key={n.id} n={n} active={active} onClick={() => setActive(n.id)} />
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs leading-relaxed text-mut">
          <p className="font-medium text-ink/80">Topic 5 · RNA structure for CRISPR</p>
          <p className="mt-1">Thomas Yu · Linus Tan · Henry Zhang · Brady Lambert</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-bg lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand small />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((n) => (
            <NavButton key={n.id} n={n} active={active} onClick={() => setActive(n.id)} compact />
          ))}
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div key={active} className="animate-rise">{view()}</div>
        <footer className="mx-auto mt-16 max-w-6xl border-t border-line pt-6 text-xs text-mut">
          <p>
            Built for the Pre-College computational biology project. Folding runs entirely in your
            browser. The Dataset tab uses real measured guide efficiencies (Doench 2014+2016, via CRISPOR);
            the "Check our work" tab compares our folders against ViennaRNA.
          </p>
        </footer>
      </main>
    </div>
  );
}

function Brand({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/15 text-teal ring-1 ring-teal/30">
        <Dna size={20} />
      </span>
      <div>
        <div className={cn("font-display font-bold leading-none text-ink", small ? "text-base" : "text-lg")}>RNA Fold Lab</div>
        <div className="text-[11px] text-mut">folding · CRISPR guides</div>
      </div>
    </div>
  );
}

function NavButton({
  n,
  active,
  onClick,
  compact,
}: {
  n: (typeof NAV)[number];
  active: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = n.icon;
  const isActive = active === n.id;
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap",
        isActive ? "bg-teal/15 text-teal" : "text-mut hover:bg-surface2 hover:text-ink",
        compact && "shrink-0",
      )}
    >
      <Icon size={17} />
      {n.label}
    </button>
  );
}
