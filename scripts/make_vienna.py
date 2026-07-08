"""
Optional: add ViennaRNA as a third, independent check.

ViennaRNA is a trusted outside program that folds RNA using yet another method
(energy minimization with the full Turner parameter set). If our two folders agree
with ViennaRNA AND with the known real shapes, that is strong evidence we are right.

How to use:
    pip install ViennaRNA
    python scripts/make_vienna.py

It reads public/data/references.json, folds each sequence with ViennaRNA, and writes
public/data/vienna.json. The website will then show a "ViennaRNA F1" number on the
"Check our work" page automatically. If you never run this, the site simply leaves
that extra check out.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "public", "data")

try:
    import RNA  # the ViennaRNA python package
except Exception:
    print("ViennaRNA is not installed. Install it with:  pip install ViennaRNA")
    sys.exit(1)

with open(os.path.join(DATA, "references.json"), encoding="utf-8") as fh:
    refs = json.load(fh)

out = {}
for r in refs:
    structure, mfe = RNA.fold(r["seq"])
    out[r["id"]] = {"structure": structure, "energy": round(mfe, 2)}

with open(os.path.join(DATA, "vienna.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=2)

print(f"Wrote vienna.json for {len(out)} reference sequences.")
