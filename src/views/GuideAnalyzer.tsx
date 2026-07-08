import { useEffect, useMemo, useState } from "react";
import { analyzeGuide, SEED_LENGTH, type Algo } from "../engine";
import { loadGuideModel, predictEfficiency, type GuideModel } from "../lib/model";
import { Card, CardHead, Badge, Stat, Note, Button, Segmented } from "../components/ui/kit";
import { FoldView } from "../components/FoldView";
import { DotBracket } from "../components/DotBracket";
import { Gauge } from "../components/Gauge";
import { Target, AlertTriangle, BrainCircuit } from "lucide-react";

const EXAMPLES = [
  { label: "Low GC", seq: "AGAAUGAAAGAUGAAAGAUA" },
  { label: "GC palindrome", seq: "GCGCGAUACGCGUAUCGCGC" },
  { label: "Has TTTT", seq: "GACUUUUACGUUAGCAUGAA" },
];

export function GuideAnalyzer({ initialSpacer }: { initialSpacer?: string }) {
  const [spacer, setSpacer] = useState(initialSpacer ?? "CUUAAGGGUUAAGUAAGUGU");
  useEffect(() => {
    if (initialSpacer) setSpacer(initialSpacer);
  }, [initialSpacer]);
  const [algo, setAlgo] = useState<Algo>("zuker");
  const [scaffold, setScaffold] = useState(true);

  const { a, error } = useMemo(() => {
    try {
      if (!spacer.trim()) return { a: null, error: "" };
      return { a: analyzeGuide(spacer, algo, { withScaffold: scaffold }), error: "" };
    } catch (e) {
      return { a: null, error: (e as Error).message };
    }
  }, [spacer, algo, scaffold]);

  const [model, setModel] = useState<GuideModel | null>(null);
  useEffect(() => {
    loadGuideModel(import.meta.env.BASE_URL).then(setModel);
  }, []);
  const pred = useMemo(() => (model ? predictEfficiency(model, spacer) : null), [model, spacer]);

  const seedStartInFull = a ? Math.max(0, a.spacer.length - SEED_LENGTH) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Guide Analyzer</h1>
        <p className="mt-1 text-mut">
          Paste a CRISPR guide (the 20-letter targeting part). We fold it and check the seed — the
          end that grabs the DNA. If the seed folds up, the guide usually works worse.
        </p>
      </div>

      <Card>
        <div className="p-5">
          <label htmlFor="spacer" className="mb-2 block text-sm font-medium text-ink">
            Guide spacer (20 letters)
          </label>
          <input
            id="spacer"
            value={spacer}
            onChange={(e) => setSpacer(e.target.value)}
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-bg/60 p-3 font-mono text-sm text-ink outline-none focus:border-teal/60"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {EXAMPLES.map((ex) => (
              <Button key={ex.label} variant="outline" onClick={() => setSpacer(ex.seq)}>
                {ex.label}
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-mut">
                <input type="checkbox" checked={scaffold} onChange={(e) => setScaffold(e.target.checked)} className="accent-teal" />
                add the scaffold tail
              </label>
              <Segmented value={algo} onChange={setAlgo} options={[{ value: "zuker", label: "Zuker" }, { value: "nussinov", label: "Nussinov" }]} />
            </div>
          </div>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      </Card>

      {a ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHead title="Seed check" sub="the key number" icon={<Target size={18} />} />
            <div className="space-y-4 p-5 pt-3">
              <Gauge value={a.seedOpenness} label="Seed openness" />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="G / C" value={`${a.gcPercent.toFixed(0)}%`} />
                {a.energy !== undefined ? <Stat label="Energy" value={a.energy} hint="kcal/mol" /> : <Stat label="Pairs" value={a.spacerStructure.replace(/[^()]/g, "").length / 2} />}
              </div>
              <div>
                <div className="mb-1.5 text-sm text-mut">Design flags</div>
                {a.warnings.length ? (
                  <div className="flex flex-wrap gap-2">
                    {a.warnings.map((w) => (
                      <Badge key={w} tone="amber">
                        <AlertTriangle size={12} className="mr-1" />
                        {w}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge tone="good">looks clean</Badge>
                )}
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHead title="How the guide folds" sub={scaffold ? "spacer + scaffold tail — seed bases in amber" : "spacer only — seed bases in amber"} />
            <div className="p-5 pt-3">
              <FoldView sequence={a.full} pairs={foldPairs(a.structure)} seedStart={seedStartInFull} />
              <div className="mt-3">
                <div className="mb-1.5 text-sm text-mut">Just the spacer:</div>
                <DotBracket sequence={a.spacer} structure={a.spacerStructure} seedStart={seedStartInFull} />
              </div>
              <div className="mt-3">
                <Note tone="amber">
                  Openness is the share of the {SEED_LENGTH} seed letters that are free (a dot, not a
                  bracket). Higher is better — a free seed can reach the DNA.
                </Note>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {pred && model ? (
        <Card>
          <CardHead title="Neural-net efficiency prediction" sub="a small model we trained on real guides" icon={<BrainCircuit size={18} />} />
          <div className="grid gap-5 p-5 pt-3 lg:grid-cols-2">
            <div className="space-y-3">
              <Gauge value={pred.value} label="Predicted editing efficiency" />
              <div className="flex flex-wrap gap-2">
                <Badge tone="indigo">test accuracy ρ = {model.meta.testSpearman}</Badge>
                <Badge tone="mut">{model.meta.params.toLocaleString()} weights</Badge>
                <Badge tone="mut">{model.meta.trainN} train / {model.meta.testN} test</Badge>
              </div>
            </div>
            <Note tone="indigo">
              A small neural network ({model.meta.hidden} hidden units, {model.meta.params.toLocaleString()} weights)
              trained on {model.meta.trainedOn}. Inputs: the letter at each position, each neighbouring pair, GC content,
              and the seed openness from our own folder. On {model.meta.testN} held-out guides it reaches Spearman ρ ≈{" "}
              {model.meta.testSpearman} — modest but real: it beats GC alone (ρ ≈ {model.meta.baselineGcSpearman}), and
              adding our folding feature nudges it up from ρ ≈ {model.meta.testSpearmanNoOpenness}. Predicting efficiency
              from the 20-letter spacer alone is genuinely hard, so treat this as a rough guide. It runs in your browser.
            </Note>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function foldPairs(structure: string): [number, number][] {
  const stack: number[] = [];
  const out: [number, number][] = [];
  for (let i = 0; i < structure.length; i += 1) {
    if (structure[i] === "(") stack.push(i);
    else if (structure[i] === ")") {
      const j = stack.pop();
      if (j !== undefined) out.push([j, i]);
    }
  }
  return out;
}
