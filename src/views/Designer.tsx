import { useEffect, useMemo, useState } from "react";
import { gcPercent } from "../engine";
import { findGuides, EXAMPLE_TARGET } from "../lib/guides";
import { loadGuideModel, predictEfficiency, type GuideModel } from "../lib/model";
import { Card, CardHead, Stat, Note, Button, Badge } from "../components/ui/kit";
import { Crosshair, ArrowUpRight, AlertTriangle } from "lucide-react";

interface Scored {
  spacer: string;
  strand: "+" | "-";
  position: number;
  gc: number;
  openness: number;
  predEff: number | null;
  warnings: string[];
}

export function Designer({ onOpen }: { onOpen: (spacer: string) => void }) {
  const [dna, setDna] = useState(EXAMPLE_TARGET);
  const [model, setModel] = useState<GuideModel | null>(null);
  useEffect(() => {
    loadGuideModel(import.meta.env.BASE_URL).then(setModel);
  }, []);

  const { rows, error, total } = useMemo(() => {
    try {
      if (!dna.trim()) return { rows: [] as Scored[], error: "", total: 0 };
      const cands = findGuides(dna);
      const scored: Scored[] = cands.map((c) => {
        const gc = gcPercent(c.spacer);
        const p = model ? predictEfficiency(model, c.spacer) : null;
        const openness = p ? p.openness : 0;
        const warnings: string[] = [];
        if (c.spacer.includes("TTTT")) warnings.push("TTTT");
        if (gc < 30) warnings.push("low GC");
        if (gc > 75) warnings.push("high GC");
        return { spacer: c.spacer, strand: c.strand, position: c.position, gc, openness, predEff: p ? p.value : null, warnings };
      });
      scored.sort((a, b) => (b.predEff ?? b.openness) - (a.predEff ?? a.openness));
      return { rows: scored, error: "", total: cands.length };
    } catch (e) {
      return { rows: [] as Scored[], error: (e as Error).message, total: 0 };
    }
  }, [dna, model]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Guide Designer</h1>
        <p className="mt-1 text-mut">
          Paste a target DNA sequence. We find every Cas9 guide site (an NGG PAM, on both strands),
          fold each guide, and rank them by the neural net's predicted efficiency — the real
          guide-design workflow, end to end.
        </p>
      </div>

      <Card>
        <div className="p-5">
          <label htmlFor="dna" className="mb-2 block text-sm font-medium text-ink">
            Target DNA
          </label>
          <textarea
            id="dna"
            value={dna}
            onChange={(e) => setDna(e.target.value)}
            spellCheck={false}
            rows={4}
            className="w-full resize-none rounded-lg border border-line bg-bg/60 p-3 font-mono text-xs text-ink outline-none focus:border-teal/60"
            placeholder="Paste a DNA sequence (A, C, G, T)…"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setDna(EXAMPLE_TARGET)}>Example (EMX1)</Button>
            <Button variant="ghost" onClick={() => setDna("")}>Clear</Button>
            <span className="ml-auto text-xs text-mut">{dna.replace(/\s/g, "").length} bp</span>
          </div>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      </Card>

      {rows.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Guide sites found" value={total} hint="NGG PAM, both strands" tone="#2DD4BF" />
            <Stat label="Best predicted efficiency" value={rows[0].predEff != null ? `${Math.round(rows[0].predEff * 100)}%` : "…"} hint="top-ranked guide" />
            <Stat label="Clean guides" value={rows.filter((r) => !r.warnings.length).length} hint="no design flags" />
          </div>

          <Card>
            <CardHead title="Ranked guides" sub={model ? "sorted by predicted efficiency" : "loading model — sorted by seed openness for now"} icon={<Crosshair size={18} />} />
            <div className="max-h-[28rem] overflow-auto p-5 pt-3">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-mut">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">#</th>
                    <th className="pb-2 pr-3 font-medium">Spacer (DNA)</th>
                    <th className="pb-2 pr-3 font-medium">Strand</th>
                    <th className="pb-2 pr-3 font-medium">Pos</th>
                    <th className="pb-2 pr-3 font-medium">GC</th>
                    <th className="pb-2 pr-3 font-medium">Seed open</th>
                    <th className="pb-2 pr-3 font-medium">Pred. eff</th>
                    <th className="pb-2 pr-3 font-medium">Flags</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {rows.slice(0, 150).map((r, i) => (
                    <tr key={`${r.strand}${r.position}`} className="border-t border-line/60">
                      <td className="py-1.5 pr-3 text-mut">{i + 1}</td>
                      <td className="py-1.5 pr-3">{r.spacer}</td>
                      <td className="py-1.5 pr-3 text-mut">{r.strand}</td>
                      <td className="py-1.5 pr-3 text-mut">{r.position}</td>
                      <td className="py-1.5 pr-3">{r.gc.toFixed(0)}%</td>
                      <td className="py-1.5 pr-3">{Math.round(r.openness * 100)}%</td>
                      <td className="py-1.5 pr-3">
                        {r.predEff != null ? <Badge tone={r.predEff >= 0.66 ? "good" : r.predEff >= 0.4 ? "amber" : "danger"}>{Math.round(r.predEff * 100)}%</Badge> : "…"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {r.warnings.length ? (
                          <span className="inline-flex items-center gap-1 text-amber">
                            <AlertTriangle size={12} />
                            {r.warnings.join(", ")}
                          </span>
                        ) : (
                          <span className="text-good">clean</span>
                        )}
                      </td>
                      <td className="py-1.5">
                        <button onClick={() => onOpen(r.spacer)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-teal hover:bg-surface2 cursor-pointer" title="Open in Guide Analyzer">
                          open <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Note tone="amber">
            "Predicted efficiency" is our small neural net (see the Guide Analyzer for its honest accuracy).
            It's a rough guide, so use it to shortlist — then check the top hits and any wet-lab constraints yourself.
          </Note>
        </>
      ) : !error ? (
        <Note>No guide sites yet — paste some DNA, or click the EMX1 example.</Note>
      ) : null}
    </div>
  );
}
