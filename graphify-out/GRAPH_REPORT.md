# Graph Report - C:\Users\thomas\Desktop\nussinov-zuker-crispr\src  (2026-07-08)

## Corpus Check
- Corpus is ~7,603 words - fits in a single context window. You may not need a graph.

## Summary
- 82 nodes · 222 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App.tsx|App.tsx]]
- [[_COMMUNITY_zuker.ts|zuker.ts]]
- [[_COMMUNITY_GuideAnalyzer.tsx|GuideAnalyzer.tsx]]
- [[_COMMUNITY_accessibility.ts|accessibility.ts]]
- [[_COMMUNITY_zuker()|zuker()]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_stats.ts|stats.ts]]
- [[_COMMUNITY_Validate.tsx|Validate.tsx]]
- [[_COMMUNITY_FoldLab.tsx|FoldLab.tsx]]
- [[_COMMUNITY_utils.ts|utils.ts]]
- [[_COMMUNITY_Dataset.tsx|Dataset.tsx]]

## God Nodes (most connected - your core abstractions)
1. `nussinov()` - 11 edges
2. `zuker()` - 11 edges
3. `analyzeGuide()` - 9 edges
4. `cn()` - 9 edges
5. `normalizeRNA()` - 8 edges
6. `Card()` - 7 edges
7. `Badge()` - 7 edges
8. `Note()` - 7 edges
9. `dotBracketToPairs()` - 7 edges
10. `agreementPairs()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Brand()` --calls--> `cn()`  [EXTRACTED]
  App.tsx → lib/utils.ts
- `NavButton()` --calls--> `cn()`  [EXTRACTED]
  App.tsx → lib/utils.ts
- `FoldLab()` --calls--> `agreementPairs()`  [EXTRACTED]
  views/FoldLab.tsx → engine/index.ts
- `Learn()` --calls--> `nussinov()`  [EXTRACTED]
  views/Learn.tsx → engine/nussinov.ts
- `Gauge()` --calls--> `opennessColor()`  [EXTRACTED]
  components/Gauge.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.16
Nodes (8): Brand(), NAV, NavButton(), ArcDiagram(), FoldLab(), foldPairs(), GuideAnalyzer(), Learn()

### Community 1 - "zuker.ts"
Cohesion: 0.35
Nodes (8): FoldResult, CANONICAL, canPair(), Pair, pairsToDotBracket(), WOBBLE, VBack, WBack

### Community 2 - "GuideAnalyzer.tsx"
Cohesion: 0.42
Nodes (8): Badge(), Button(), Card(), CardHead(), Note(), Segmented(), cn(), EXAMPLES

### Community 3 - "accessibility.ts"
Cohesion: 0.39
Nodes (8): Algo, analyzeGuide(), fold(), GuideAnalysis, seedOpenness(), nussinov(), gcPercent(), normalizeRNA()

### Community 4 - "zuker()"
Cohesion: 0.38
Nodes (6): hairpinEnergy(), internalEnergy(), PAIR_INDEX, STACK, stackEnergy(), zuker()

### Community 5 - "index.ts"
Cohesion: 0.67
Nodes (3): accuracyVsTruth(), agreementPairs(), dotBracketToPairs()

### Community 6 - "stats.ts"
Cohesion: 0.47
Nodes (5): describeCorrelation(), pearson(), ranks(), spearman(), Dataset()

### Community 7 - "Validate.tsx"
Cohesion: 0.50
Nodes (3): DotBracket(), Ref, Validate()

### Community 10 - "Dataset.tsx"
Cohesion: 0.50
Nodes (3): Stat(), Guide, Point

## Knowledge Gaps
- **13 isolated node(s):** `NAV`, `GuideAnalysis`, `PAIR_INDEX`, `STACK`, `CANONICAL` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zuker()` connect `zuker()` to `zuker.ts`, `accessibility.ts`, `index.ts`, `Validate.tsx`, `FoldLab.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `analyzeGuide()` connect `accessibility.ts` to `Dataset.tsx`, `GuideAnalyzer.tsx`, `index.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `nussinov()` connect `accessibility.ts` to `App.tsx`, `zuker.ts`, `index.ts`, `Validate.tsx`, `FoldLab.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `NAV`, `GuideAnalysis`, `PAIR_INDEX` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._