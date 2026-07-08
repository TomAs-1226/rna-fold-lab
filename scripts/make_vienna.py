"""
Adds ViennaRNA as the "standard library" to compare our own folders against.

ViennaRNA is a trusted, widely used program that folds RNA with the full Turner
energy model. It is written in C and cannot run in a browser, so we run it here once
and save the results to public/data/vienna.json. The website reads that file and shows,
on the "Check our work" page:
  - how accurate each method (our Nussinov, our Zuker, ViennaRNA) is vs known real shapes
  - how much our Zuker fold agrees with ViennaRNA on a sample of real guide RNAs

How to use:
    pip install ViennaRNA
    python scripts/make_vienna.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "public", "data")
SCAFFOLD = "GUUUUAGAGCUAGAAAUAGCAAGUUAAAAUAAGGCUAGUCCGUUAUCAACUUGAAAAAGUGGCACCGAGUCGGUGC"
SAMPLE = 30  # how many real guides to benchmark against

try:
    import RNA
except Exception:
    print("ViennaRNA is not installed. Install it with:  pip install ViennaRNA")
    sys.exit(1)


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as fh:
        return json.load(fh)


out = {"references": {}, "guideSample": []}

# 1) known reference structures
for r in load("references.json"):
    structure, mfe = RNA.fold(r["seq"])
    out["references"][r["id"]] = {"structure": structure, "energy": round(mfe, 2)}

# 2) a sample of real guides, folded as the full sgRNA (spacer + scaffold)
guides = load("guides.json")
step = max(1, len(guides) // SAMPLE)
for g in guides[::step][:SAMPLE]:
    full = g["spacer"].replace("T", "U") + SCAFFOLD
    structure, mfe = RNA.fold(full)
    out["guideSample"].append(
        {"id": g["id"], "spacer": g["spacer"], "full": full, "structure": structure, "energy": round(mfe, 2)}
    )

with open(os.path.join(DATA, "vienna.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=2)

print(f"Wrote vienna.json: {len(out['references'])} references + {len(out['guideSample'])} guide folds.")
