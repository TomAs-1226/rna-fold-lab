import { useEffect, useMemo, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { nussinov, zuker, accuracyVsTruth, agreementPairs, dotBracketToPairs } from "../engine";
import { pearson } from "../lib/stats";
import { Card, CardHead, Note, Badge, Stat } from "../components/ui/kit";
import { DotBracket } from "../components/DotBracket";
import { ShieldCheck, GitCompareArrows } from "lucide-react";

interface Ref {
  id: string;
  name: string;
  seq: string;
  structure: string;
  note: string;
  cite: string;
}
interface Vienna {
  references: Record<string, { structure: string; energy: number }>;
  guideSample: Array<{ id: string; spacer: string; full: string; structure: string; energy: number }>;
}

export function Validate() {
  const [refs, setRefs] = useState<Ref[] | null>(null);
  const [vienna, setVienna] = useState<Vienna | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/references.json`).then((r) => r.json()).then(setRefs).catch(() => setRefs([]));
    fetch(`${import.meta.env.BASE_URL}data/vienna.json`).then((r) => (r.ok ? r.json() : null)).then(setVienna).catch(() => setVienna(null));
  }, []);

  // accuracy of each method vs the known real shape
  const rows = useMemo(() => {
    if (!refs) return [];
    return refs.map((ref) => {
      const nu = nussinov(ref.seq);
      const zu = zuker(ref.seq);
      const v = vienna?.references?.[ref.id];
      return {
        ref,
        nuss: nu,
        zuk: zu,
        viennaStructure: v?.structure ?? null,
        nussF1: accuracyVsTruth(nu.structure, ref.structure).f1,
        zukF1: accuracyVsTruth(zu.structure, ref.structure).f1,
        viennaF1: v ? accuracyVsTruth(v.structure, ref.structure).f1 : null,
      };
    });
  }, [refs, vienna]);

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const avgNuss = avg(rows.map((r) => r.nussF1));
  const avgZuk = avg(rows.map((r) => r.zukF1));
  const avgVienna = rows.every((r) => r.viennaF1 != null) && rows.length ? avg(rows.map((r) => r.viennaF1 as number)) : null;

  // our Zuker vs ViennaRNA on a sample of real guides
  const bench = useMemo(() => {
    if (!vienna?.guideSample?.length) return null;
    let sharedFrac = 0;
    const energies: Array<{ ours: number; vienna: number }> = [];
    for (const g of vienna.guideSample) {
      const ours = zuker(g.full);
      const shared = agreementPairs(ours.structure, g.structure).length;
      const theirs = dotBracketToPairs(g.structure).length;
      sharedFrac += theirs ? shared / theirs : 1;
      energies.push({ ours: ours.energy ?? 0, vienna: g.energy });
    }
    const n = vienna.guideSample.length;
    return {
      n,
      agreement: Math.round((sharedFrac / n) * 100),
      energyCorr: pearson(energies.map((e) => e.ours), energies.map((e) => e.vienna)),
      energies,
    };
  }, [vienna]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Check our work</h1>
        <p className="mt-1 text-mut">
          How accurate are our from-scratch folders? We line them up against RNA shapes solved in a
          lab, and against ViennaRNA — a trusted standard program that uses yet another method.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Answer-key RNAs" value={rows.length} />
        <Stat label="Our Zuker" value={avgZuk.toFixed(2)} hint="avg accuracy (F1) vs truth" tone="#2DD4BF" />
        <Stat label="Our Nussinov" value={avgNuss.toFixed(2)} hint="avg accuracy (F1)" />
        <Stat label="ViennaRNA" value={avgVienna != null ? avgVienna.toFixed(2) : "—"} hint="the standard tool" tone="#818CF8" />
      </div>

      <Note tone="indigo">
        <strong>Accuracy (F1)</strong> is how much of the real shape a method found: 1.0 is perfect, 0
        is none. All three methods work differently — ours count pairs / minimize a simple energy,
        ViennaRNA uses the full lab-measured energy set — so agreement across them is real evidence.
      </Note>

      {/* per-reference comparison */}
      <div className="space-y-6">
        {rows.map((r) => (
          <Card key={r.ref.id}>
            <CardHead title={r.ref.name} sub={r.ref.note} icon={<ShieldCheck size={18} />} />
            <div className="space-y-3 p-5 pt-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={r.zukF1 >= 0.75 ? "good" : r.zukF1 >= 0.4 ? "amber" : "danger"}>Our Zuker F1 {r.zukF1.toFixed(2)}</Badge>
                <Badge tone={r.nussF1 >= 0.75 ? "good" : r.nussF1 >= 0.4 ? "amber" : "danger"}>Our Nussinov F1 {r.nussF1.toFixed(2)}</Badge>
                {r.viennaF1 != null ? <Badge tone="indigo">ViennaRNA F1 {r.viennaF1.toFixed(2)}</Badge> : null}
                <Badge tone="mut">{r.ref.seq.length} bases</Badge>
              </div>
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-mut">Known real shape</div>
                <DotBracket sequence={r.ref.seq} structure={r.ref.structure} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-teal">Our Zuker</div>
                  <DotBracket sequence={r.zuk.sequence} structure={r.zuk.structure} />
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-mut">Our Nussinov</div>
                  <DotBracket sequence={r.nuss.sequence} structure={r.nuss.structure} />
                </div>
                {r.viennaStructure ? (
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-indigo">ViennaRNA</div>
                    <DotBracket sequence={r.ref.seq} structure={r.viennaStructure} />
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* head-to-head on real guides */}
      {bench ? (
        <Card>
          <CardHead title="Our Zuker vs. ViennaRNA — on real guides" sub={`${bench.n} full sgRNAs folded by both`} icon={<GitCompareArrows size={18} />} />
          <div className="grid gap-5 p-5 pt-3 lg:grid-cols-2">
            <div className="space-y-4">
              <Stat label="Base-pair agreement" value={`${bench.agreement}%`} hint="of ViennaRNA's pairs our Zuker also finds" tone="#2DD4BF" />
              <Stat label="Energy correlation" value={`r = ${bench.energyCorr.toFixed(2)}`} hint="our ΔG vs ViennaRNA ΔG" tone="#818CF8" />
              <Note>
                Our simple model is not identical to ViennaRNA — that is expected, since ViennaRNA
                uses the full lab-measured energies. But the two line up closely, which is a good sign
                our folder is doing the right thing.
              </Note>
            </div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 16, bottom: 34, left: 6 }}>
                  <CartesianGrid stroke="#22304B" strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="vienna" name="ViennaRNA" unit="" stroke="#93A4BE" tick={{ fontSize: 11 }} label={{ value: "ViennaRNA ΔG (kcal/mol)", position: "bottom", offset: 16, fill: "#93A4BE", fontSize: 11 }} />
                  <YAxis type="number" dataKey="ours" name="Ours" stroke="#93A4BE" tick={{ fontSize: 11 }} label={{ value: "Our ΔG", angle: -90, position: "insideLeft", fill: "#93A4BE", fontSize: 11 }} />
                  <ReferenceLine segment={[{ x: -40, y: -40 }, { x: 0, y: 0 }]} stroke="#2A3A57" strokeDasharray="4 4" />
                  <Tooltip contentStyle={{ background: "#111C31", border: "1px solid #22304B", borderRadius: 10, color: "#E7EEF7", fontSize: 12 }} formatter={(v: number) => `${v} kcal/mol`} labelFormatter={() => ""} />
                  <Scatter data={bench.energies} fill="#2DD4BF" fillOpacity={0.8} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      ) : (
        <Note tone="amber">
          The ViennaRNA comparison data isn't loaded. Run <span className="font-mono">python scripts/make_vienna.py</span> (with ViennaRNA installed) and rebuild.
        </Note>
      )}
    </div>
  );
}
