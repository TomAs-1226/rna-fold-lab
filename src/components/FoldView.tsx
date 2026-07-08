import { Suspense, lazy, useState } from "react";
import type { Pair } from "../engine";
import { Segmented } from "./ui/kit";
import { StructureView2D } from "./StructureView2D";
import { ArcDiagram } from "./ArcDiagram";

const Structure3D = lazy(() => import("./Structure3D"));

type Mode = "2d" | "3d" | "arc";

// One fold, three ways to look at it. Defaults to the 2D shape (fits the box, no
// scrolling). "3D" is a rotatable view; "Arc" is the linear diagram.
export function FoldView({ sequence, pairs, seedStart }: { sequence: string; pairs: Pair[]; seedStart?: number }) {
  const [mode, setMode] = useState<Mode>("2d");
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "2d", label: "2D shape" },
            { value: "3d", label: "3D" },
            { value: "arc", label: "Arc" },
          ]}
        />
      </div>
      {mode === "2d" && <StructureView2D sequence={sequence} pairs={pairs} seedStart={seedStart} />}
      {mode === "arc" && <ArcDiagram sequence={sequence} pairs={pairs} seedStart={seedStart} />}
      {mode === "3d" && (
        <Suspense fallback={<div className="flex h-[360px] items-center justify-center text-sm text-mut">Loading 3D…</div>}>
          <Structure3D sequence={sequence} pairs={pairs} seedStart={seedStart} />
        </Suspense>
      )}
      {mode === "3d" ? <p className="mt-1 text-center text-xs text-mut">Drag to rotate · scroll to zoom · a 3D layout of the predicted secondary structure</p> : null}
    </div>
  );
}
