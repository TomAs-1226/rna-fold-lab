import { type ReactNode } from "react";
import { nussinov } from "../engine";
import { Card, Badge, Note } from "../components/ui/kit";
import { ArcDiagram } from "../components/ArcDiagram";

// Everything here is written in small, plain blocks. No jargon without a plain meaning next to it.

function Block({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Card className="animate-rise">
      <div className="p-5">
        <div className="mb-2 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/15 font-mono text-sm font-semibold text-teal">
            {n}
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        </div>
        <div className="space-y-2 text-[15px] leading-relaxed text-mut">{children}</div>
      </div>
    </Card>
  );
}

export function Learn() {
  const demo = nussinov("GGGAAACCC");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Learn</h1>
        <p className="mt-1 text-mut">The whole idea, in small plain steps. No background needed.</p>
      </div>

      <Block n={1} title="What is RNA?">
        <p>RNA is a long strand made of just four letters: A, C, G, and U.</p>
        <p>It does not stay in a straight line. It bends and sticks to itself, making shapes.</p>
      </Block>

      <Block n={2} title="How does it fold?">
        <p>Certain letters stick together: A with U, and G with C. G can also stick to U, but more weakly.</p>
        <p>When letters far apart on the strand stick together, they pull the strand into loops and stems. That shape is what we predict.</p>
        <div className="pt-2">
          <ArcDiagram sequence={demo.sequence} pairs={demo.pairs} />
          <p className="mt-1 text-sm">Above: the strand GGGAAACCC folds into a little loop. Each curve is one sticky pair.</p>
        </div>
      </Block>

      <Block n={3} title="Two ways to guess the shape">
        <p>A strand could fold many ways. We built two programs that each pick a &ldquo;best&rdquo; fold, using different rules:</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge tone="teal">Nussinov: the fold with the most sticky pairs</Badge>
          <Badge tone="indigo">Zuker: the most stable fold (the one that holds together best)</Badge>
        </div>
      </Block>

      <Block n={4} title="Why two different programs?">
        <p>If we copied a program that already exists, matching it would prove nothing.</p>
        <p>Our two programs work in totally different ways. So when they land on the same pairs, that agreement is real evidence the shape is right. We also test them on RNA shapes scientists already solved, as an answer key.</p>
      </Block>

      <Block n={5} title="What does this have to do with CRISPR?">
        <p>CRISPR uses a short piece of RNA, called a guide, to find one exact spot in DNA.</p>
        <p>The guide has to be free to stick to that DNA. The tip that touches first is called the <span className="text-amber">seed</span>.</p>
        <p>If the guide folds up and hides its own seed, it cannot grab the DNA well, so it works worse. Predicting the fold lets us spot those weak guides early.</p>
      </Block>

      <Block n={6} title="How to use this site">
        <p><strong className="text-ink">Fold Lab</strong> — type any strand and watch both programs fold it.</p>
        <p><strong className="text-ink">Guide Analyzer</strong> — paste a guide and see if its seed stays open.</p>
        <p><strong className="text-ink">Designer</strong> — paste a target DNA and get a ranked list of guide options.</p>
        <p><strong className="text-ink">Dataset</strong> — check many guides at once for the open-seed pattern.</p>
        <p><strong className="text-ink">Check our work</strong> — see how close our programs get to real, known shapes.</p>
      </Block>

      <Block n={7} title="Is this AlphaFold?">
        <p>Not quite — and the difference is worth knowing.</p>
        <p>
          <strong className="text-ink">AlphaFold</strong> predicts the full <strong className="text-ink">3D</strong>{" "}
          shape of proteins with a giant trained AI model. That is a hard problem that needs powerful computers and
          takes minutes.
        </p>
        <p>
          We predict RNA <strong className="text-ink">secondary structure</strong> — only which letters pair with
          which. That is a solved problem with fast, exact algorithms from the 1980s, which is why our folds finish in
          a few milliseconds.
        </p>
        <p>
          The 3D view on this site simply arranges that 2D structure in space so you can look at it. It is not a
          physics-based 3D model of the real molecule.
        </p>
      </Block>

      <Note>
        Want the deeper version? The full write-up and the two original papers (Nussinov 1980, Zuker &amp; Stiegler 1981) are listed in the project&rsquo;s reading list.
      </Note>
    </div>
  );
}
