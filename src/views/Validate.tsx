import { useEffect, useMemo, useState } from "react";
import { nussinov, zuker, accuracyVsTruth, agreementPairs } from "../engine";
import { Card, CardHead, Note, Badge, Stat } from "../components/ui/kit";
import { DotBracket } from "../components/DotBracket";
import { ShieldCheck } from "lucide-react";

interface Ref {
  id: string;
  name: string;
  seq: string;
  structure: string;
  note: string;
  cite: string;
}

export function Validate() {
  const [refs, setRefs] = useState<Ref[] | null>(null);
  const [vienna, setVienna] = useState<Record<string, { structure: string; energy: number }> | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/references.json`)
      .then((r) => r.json())
      .then(setRefs)
      .catch(() => setRefs([]));
    // optional third check — only present after running scripts/make_vienna.py
    fetch(`${import.meta.env.BASE_URL}data/vienna.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setVienna)
      .catch(() => setVienna(null));
  }, []);

  const rows = useMemo(() => {
    if (!refs) return [];
    return refs.map((ref) => {
      const nu = nussinov(ref.seq);
      const zu = zuker(ref.seq);
      const v = vienna?.[ref.id];
      return {
        ref,
        nuss: nu,
        zuk: zu,
        nussF1: accuracyVsTruth(nu.structure, ref.structure).f1,
        zukF1: accuracyVsTruth(zu.structure, ref.structure).f1,
        viennaF1: v ? accuracyVsTruth(v.structure, ref.structure).f1 : null,
        agree: agreementPairs(nu.structure, zu.structure).length,
      };
    });
  }, [refs, vienna]);

  const avgZ = rows.length ? rows.reduce((s, r) => s + r.zukF1, 0) / rows.length : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Check our work</h1>
        <p className="mt-1 text-mut">
          We test both folders against RNA shapes scientists already solved in a lab. If our folders
          land on the real pairs, we can trust them. If two different methods also agree with each
          other, that is extra evidence.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Answer-key RNAs" value={rows.length} />
        <Stat label="Avg. Zuker accuracy" value={avgZ.toFixed(2)} hint="F1 vs known shape (1 = perfect)" tone="#2DD4BF" />
        <Stat label="Method" value="2 folders" hint="pair-count + energy" />
      </div>

      <Note tone="indigo">
        <strong>Accuracy (F1)</strong> is how much of the real shape a folder found: 1.0 is perfect, 0
        is none. <strong>ViennaRNA</strong> — a trusted outside tool that uses yet another method — can
        be added as a third check by running <span className="font-mono">scripts/make_vienna.py</span>{" "}
        with ViennaRNA installed.
      </Note>

      <div className="space-y-6">
        {rows.map((r) => (
          <Card key={r.ref.id}>
            <CardHead title={r.ref.name} sub={r.ref.note} icon={<ShieldCheck size={18} />} />
            <div className="space-y-3 p-5 pt-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={r.zukF1 >= 0.75 ? "good" : r.zukF1 >= 0.4 ? "amber" : "danger"}>Zuker F1 {r.zukF1.toFixed(2)}</Badge>
                <Badge tone={r.nussF1 >= 0.75 ? "good" : r.nussF1 >= 0.4 ? "amber" : "danger"}>Nussinov F1 {r.nussF1.toFixed(2)}</Badge>
                {r.viennaF1 != null ? <Badge tone="indigo">ViennaRNA F1 {r.viennaF1.toFixed(2)}</Badge> : null}
                <Badge tone="teal">the 2 folders agree on {r.agree} pairs</Badge>
                <Badge tone="mut">{r.ref.seq.length} bases</Badge>
              </div>
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-mut">Known real shape</div>
                <DotBracket sequence={r.ref.seq} structure={r.ref.structure} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-mut">Our Zuker fold</div>
                  <DotBracket sequence={r.zuk.sequence} structure={r.zuk.structure} />
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-mut">Our Nussinov fold</div>
                  <DotBracket sequence={r.nuss.sequence} structure={r.nuss.structure} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
