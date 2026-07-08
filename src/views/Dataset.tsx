import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { spearman, describeCorrelation } from "../lib/stats";
import { opennessColor } from "../lib/utils";
import { Card, CardHead, Stat, Note, Badge } from "../components/ui/kit";
import { ScatterChart as ScatterIcon, FlaskConical } from "lucide-react";

interface Guide {
  id: string;
  gene: string;
  spacer: string;
  gcPercent: number;
  activity: number; // 0..1 measured editing efficiency
  seedOpenness: number; // 0..1, folded full sgRNA with our Nussinov engine
  source: string;
}

export function Dataset() {
  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/guides.json`)
      .then((r) => r.json())
      .then(setGuides)
      .catch(() => setErr("Could not load the guide data."));
  }, []);

  const { rOpen, rGc, buckets, source, geneList } = useMemo(() => {
    if (!guides || !guides.length) return { rOpen: 0, rGc: 0, buckets: [] as any[], source: "", geneList: "" };
    const open = guides.map((g) => g.seedOpenness);
    const act = guides.map((g) => g.activity);
    const gc = guides.map((g) => g.gcPercent);
    // mean activity per openness level (openness is in steps of 1/8)
    const byLevel = new Map<number, number[]>();
    guides.forEach((g) => {
      const lvl = Math.round(g.seedOpenness * 8) / 8;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl)!.push(g.activity);
    });
    const buckets = [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([lvl, acts]) => ({
        openness: Math.round(lvl * 100),
        meanActivity: Math.round((acts.reduce((s, x) => s + x, 0) / acts.length) * 100),
        n: acts.length,
      }));
    return {
      rOpen: spearman(open, act),
      rGc: spearman(gc, act),
      buckets,
      source: guides[0].source,
      geneList: [...new Set(guides.map((g) => g.gene))].join(", "),
    };
  }, [guides]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Dataset</h1>
        <p className="mt-1 text-mut">
          The real question, on real data: across many measured guides, do the ones with a more open
          seed tend to edit better? We fold each full guide with our own code, then compare.
        </p>
      </div>

      <Note tone="indigo">
        <strong>Real data.</strong> {guides ? guides.length : "…"} guides with lab-measured editing
        efficiency (genes {geneList || "…"}). Source: {source || "…"}. Seed openness was computed by
        our Nussinov folder on the full guide (spacer + scaffold).
      </Note>

      {err ? <p className="text-danger">{err}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="Editing efficiency by seed openness" sub="average of all guides at each openness level" icon={<ScatterIcon size={18} />} />
          <div className="p-5 pt-3">
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={buckets} margin={{ top: 20, right: 16, bottom: 40, left: 6 }}>
                  <CartesianGrid stroke="#22304B" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="openness" unit="%" stroke="#93A4BE" tick={{ fontSize: 12 }} label={{ value: "Seed openness (%)", position: "bottom", offset: 20, fill: "#93A4BE", fontSize: 12 }} />
                  <YAxis unit="%" domain={[0, 70]} stroke="#93A4BE" tick={{ fontSize: 12 }} label={{ value: "Mean efficiency (%)", angle: -90, position: "insideLeft", fill: "#93A4BE", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(45,212,191,0.08)" }}
                    contentStyle={{ background: "#111C31", border: "1px solid #22304B", borderRadius: 10, color: "#E7EEF7", fontSize: 12 }}
                    formatter={(v: number, _n: string, p: any) => [`${v}%  (n=${p.payload.n})`, "mean efficiency"]}
                    labelFormatter={(l) => `${l}% seed open`}
                  />
                  <Bar dataKey="meanActivity" radius={[4, 4, 0, 0]}>
                    {buckets.map((b, i) => (
                      <Cell key={i} fill={opennessColor(b.openness / 100)} />
                    ))}
                    <LabelList dataKey="n" position="top" formatter={(v: number) => `n=${v}`} style={{ fill: "#93A4BE", fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="What we found" icon={<FlaskConical size={18} />} />
          <div className="space-y-4 p-5 pt-3">
            <Stat label="Openness vs efficiency" value={`ρ = ${rOpen.toFixed(2)}`} hint={describeCorrelation(rOpen)} tone={opennessColor(rOpen > 0 ? 0.8 : 0.3)} />
            <Stat label="GC% vs efficiency" value={`ρ = ${rGc.toFixed(2)}`} hint={describeCorrelation(rGc)} />
            <Note>
              A weak <strong>positive</strong> link: more-open seeds edit a little better, the
              direction biology predicts. It is weak because efficiency depends on many things, not
              structure alone. Folding only the bare spacer hides this almost entirely (ρ ≈ 0.03) —
              the scaffold is what pairs with the seed, so you have to fold the whole guide.
            </Note>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Every guide" sub={`${guides?.length ?? 0} real guides · seed openness from our folder`} />
        <div className="max-h-80 overflow-auto p-5 pt-3">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-mut">
              <tr>
                <th className="pb-2 pr-3 font-medium">Guide</th>
                <th className="pb-2 pr-3 font-medium">Gene</th>
                <th className="pb-2 pr-3 font-medium">G/C</th>
                <th className="pb-2 pr-3 font-medium">Seed open</th>
                <th className="pb-2 font-medium">Efficiency</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {(guides ?? []).map((g) => {
                const open = Math.round(g.seedOpenness * 100);
                return (
                  <tr key={g.id} className="border-t border-line/60">
                    <td className="py-1.5 pr-3 text-mut">{g.spacer}</td>
                    <td className="py-1.5 pr-3 text-mut">{g.gene}</td>
                    <td className="py-1.5 pr-3">{g.gcPercent}%</td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={open >= 66 ? "teal" : open >= 40 ? "amber" : "danger"}>{open}%</Badge>
                    </td>
                    <td className="py-1.5">{Math.round(g.activity * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
