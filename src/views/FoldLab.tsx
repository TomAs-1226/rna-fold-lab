import { useMemo, useState } from "react";
import { nussinov, zuker, agreementPairs, type FoldResult } from "../engine";
import { Card, CardHead, Badge, Stat, Note, Button } from "../components/ui/kit";
import { ArcDiagram } from "../components/ArcDiagram";
import { DotBracket } from "../components/DotBracket";
import { DPMatrix } from "../components/DPMatrix";
import { Dna, GitCompareArrows } from "lucide-react";

const EXAMPLES = [
  { label: "Hairpin", seq: "GGGGAAAACCCC" },
  { label: "Two stems", seq: "GGGAAACCCUUGGGAAACCC" },
  { label: "Folds up", seq: "GCGCGATACGCGTATCGCGC" },
  { label: "Stays open", seq: "CUUAAGGGUUAAGUAAGUGU" },
];

function ResultCard({ result, kind }: { result: FoldResult | null; kind: "nussinov" | "zuker" }) {
  const title = kind === "nussinov" ? "Nussinov" : "Zuker";
  const sub = kind === "nussinov" ? "most base pairs" : "most stable (lowest energy)";
  return (
    <Card>
      <CardHead
        title={title}
        sub={sub}
        icon={<Dna size={18} />}
      />
      <div className="p-5 pt-3">
        {result ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="teal">{result.pairs.length} base pairs</Badge>
              {result.energy !== undefined ? (
                <Badge tone="indigo">{result.energy} kcal/mol</Badge>
              ) : (
                <Badge tone="mut">no energy (counts pairs)</Badge>
              )}
            </div>
            <ArcDiagram sequence={result.sequence} pairs={result.pairs} />
            <div className="mt-3">
              <DotBracket sequence={result.sequence} structure={result.structure} />
            </div>
          </>
        ) : (
          <p className="text-sm text-mut">Enter a sequence to fold.</p>
        )}
      </div>
    </Card>
  );
}

export function FoldLab() {
  const [seq, setSeq] = useState("GGGGAAAACCCCUUUUGGGGAAAACCCC");
  const [wobble, setWobble] = useState(true);

  const { nuss, zuk, error } = useMemo(() => {
    try {
      if (!seq.trim()) return { nuss: null, zuk: null, error: "" };
      return {
        nuss: nussinov(seq, { allowWobble: wobble }),
        zuk: zuker(seq, { allowWobble: wobble }),
        error: "",
      };
    } catch (e) {
      return { nuss: null, zuk: null, error: (e as Error).message };
    }
  }, [seq, wobble]);

  const shared = nuss && zuk ? agreementPairs(nuss.structure, zuk.structure).length : 0;
  const totalZ = zuk?.pairs.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Fold Lab</h1>
        <p className="mt-1 text-mut">
          Type an RNA (or DNA — we convert T to U) and watch our two folders shape it. They use
          different rules, so comparing them is the whole point.
        </p>
      </div>

      <Card>
        <div className="p-5">
          <label htmlFor="seq" className="mb-2 block text-sm font-medium text-ink">
            Sequence
          </label>
          <textarea
            id="seq"
            value={seq}
            onChange={(e) => setSeq(e.target.value)}
            spellCheck={false}
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-bg/60 p-3 font-mono text-sm text-ink outline-none focus:border-teal/60"
            placeholder="e.g. GGGGAAAACCCC"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {EXAMPLES.map((ex) => (
              <Button key={ex.label} variant="outline" onClick={() => setSeq(ex.seq)}>
                {ex.label}
              </Button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-mut">
              <input type="checkbox" checked={wobble} onChange={(e) => setWobble(e.target.checked)} className="accent-teal" />
              allow G-U pairs
            </label>
          </div>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <ResultCard result={nuss} kind="nussinov" />
        <ResultCard result={zuk} kind="zuker" />
      </div>

      {nuss && zuk ? (
        <Card>
          <CardHead title="How much they agree" sub="where two different methods land on the same pairs" icon={<GitCompareArrows size={18} />} />
          <div className="grid gap-4 p-5 pt-3 sm:grid-cols-3">
            <Stat label="Agreed pairs" value={shared} hint="both folders put these" tone="#2DD4BF" />
            <Stat label="Zuker pairs" value={totalZ} hint="from the stable-shape folder" />
            <Stat label="Agreement" value={`${totalZ ? Math.round((shared / totalZ) * 100) : 0}%`} hint="of Zuker's pairs" />
          </div>
          <div className="px-5 pb-5">
            <Note>
              When our pair-counting folder and our energy folder — two different methods — pick the
              same pairs, that is real evidence those pairs are right. It is not one copying the other.
            </Note>
          </div>
        </Card>
      ) : null}

      {nuss && zuk ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHead title="Nussinov grid" sub="brighter = more pairs possible" />
            <div className="p-5 pt-3">
              <DPMatrix dp={nuss.dp} kind="nussinov" />
            </div>
          </Card>
          <Card>
            <CardHead title="Zuker grid" sub="brighter = more stable (lower energy)" />
            <div className="p-5 pt-3">
              <DPMatrix dp={zuk.dp} kind="zuker" />
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
