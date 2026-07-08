# RNA Fold Lab

**Fold RNA two different ways, and check whether a CRISPR guide folds up on itself and hides the part that grabs the DNA.**

A website for our Pre-College computational biology project (Topic 5: *How can we
computationally predict RNA structure for use with methods like CRISPR?*). Everything
runs in your browser — there is no server to start.

Team: Thomas Yu · Linus Tan · Henry Zhang · Brady Lambert.

---

## The idea, in one paragraph

RNA is a strand of four letters (A, C, G, U). It folds because certain letters stick
together (A–U, G–C, and the weaker G–U). A CRISPR guide is a short RNA that has to be
free to stick to one exact spot in DNA. The tip that touches first is the **seed**. If
the guide folds up and hides its own seed, it usually works worse. This site predicts
the fold and measures how open the seed is.

## What's inside

- **Fold Lab** — type any strand and watch two folders shape it side by side.
- **Guide Analyzer** — paste a guide; see if its seed stays open, plus design flags.
- **Dataset** — check many guides at once for the "open seed works better" pattern.
- **Check our work** — test both folders against RNAs whose real shape is known.
- **Learn** — the whole idea in small, plain steps.

## Two folders, on purpose

We built **two** folders that use **different rules**, so comparing them means something:

| Folder | Rule | Built by |
|---|---|---|
| **Nussinov** | pick the fold with the **most** base pairs | us (`src/engine/nussinov.ts`) |
| **Zuker** | pick the **most stable** fold (lowest energy) | us (`src/engine/zuker.ts`) |

Because they work differently, when they agree that agreement is real evidence — not one
copying the other. We also test both against known real shapes (a tRNA and simple
hairpins), and you can add **ViennaRNA** as a third outside check (see `scripts/`).

## Run it locally

```bash
npm install
npm run dev        # opens a dev server (http://localhost:5173)
npm test           # runs the engine tests
npm run build      # builds the static site into docs/
```

## Put it online (GitHub Pages)

`npm run build` writes the finished site to the **`docs/`** folder. On GitHub:
Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, Folder: `/docs`.

## What we found (real data)

The Dataset tab uses **881 real guides** with lab-measured editing efficiency (Doench
et al. 2014, human genes CD13/CD15/CD33, via the CRISPOR benchmark of Haeussler et al.
2016 — `scripts/fetch_real_dataset.mjs`). Folding the **whole guide** (spacer + scaffold)
with our own code, seed openness shows a **weak positive** link with efficiency
(Spearman ρ ≈ +0.12) — the direction biology predicts, but weak, because efficiency
depends on many factors. Folding only the bare spacer hides it almost entirely
(ρ ≈ 0.03): the scaffold is what pairs with the seed, so you have to fold the full guide.
That "fold the whole thing, not just the spacer" point is the project's small real finding.

## Honest notes

- The Zuker folder uses a **simplified** energy model (not the full lab-measured set),
  which is exactly why we compare it to ViennaRNA and to known shapes.
- Seed openness in the Dataset tab is precomputed by our Nussinov folder (code in
  `src/engine/`) so the page loads fast; single guides are folded live everywhere else.

## Reading list

- Nussinov, R., & Jacobson, A. B. (1980). Fast algorithm for predicting the secondary structure of single-stranded RNA. *PNAS, 77*(11), 6309–6313.
- Zuker, M., & Stiegler, P. (1981). Optimal computer folding of large RNA sequences using thermodynamics and auxiliary information. *Nucleic Acids Research, 9*(1), 133–148.
- Lorenz, R., et al. (2011). ViennaRNA Package 2.0. *Algorithms for Molecular Biology, 6*, 26.
- Wong, N., Liu, W., & Wang, X. (2015). WU-CRISPR. *Genome Biology, 16*, 218.
