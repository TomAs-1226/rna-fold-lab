# Data scripts

These build the small data files the website reads. You normally do **not** need to
run them — the data is already checked in under `public/data/`.

## `make_data.mjs`

```bash
node scripts/make_data.mjs
```

Writes two files:

- **`public/data/guides.json`** — 44 example guide spacers. The `activity` numbers are
  **example (made-up) values**, generated from simple sequence rules plus random noise.
  They are only there so the Dataset page has something to plot. To draw a real
  conclusion, replace this file with the public Doench et al. (2016) guide-activity set
  (same shape: a list of `{ spacer, activity }`).
- **`public/data/references.json`** — RNAs whose real shape is already known (a designed
  hairpin, two hairpins, and a real yeast tRNA). These are the "answer key" the
  "Check our work" page tests against.

## `make_vienna.py` (optional)

```bash
pip install ViennaRNA
python scripts/make_vienna.py
```

Adds a third, outside opinion. It folds the reference sequences with **ViennaRNA** and
writes `public/data/vienna.json`. The website then shows a "ViennaRNA F1" score on the
"Check our work" page. Skip it and the site just leaves that extra check out.
