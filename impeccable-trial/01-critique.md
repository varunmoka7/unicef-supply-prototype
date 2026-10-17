# Critique of the original pages

Method: rendered all 7 routes at 1440 and 390 px (Chrome via Playwright), read src, ran the detector. Mode: Operate. Reader: contracts manager and sustainability checkers who verify figures. Scored against Nielsen's ten heuristics (0 to 4).

| # | Heuristic | Score | Note |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Which tier a figure has is only visible after opening the panel; no mark on the figure itself |
| 2 | Match with real world | 2 | "Hypergraph", "hyperedges", "contexts", "concepts" are builder vocabulary, not the readers' |
| 3 | User control | 3 | Panel closes, filters exist |
| 4 | Consistency | 1 | Four visual worlds: light cards, big-hero /portfolio, dark /segments, white SVG /map |
| 5 | Error prevention | 3 | Gaps are shown as gaps |
| 6 | Recognition over recall | 2 | Chips, colours and pills are not keyed in one place; /climate legend is below the fold on mobile |
| 7 | Flexibility | 2 | No way to jump between a supplier's rows across routes |
| 8 | Minimalist design | 1 | The same three disclaimers repeat on four routes; coverage tiles lead with 33,937 as a hero metric |
| 9 | Error recovery | 3 | |
| 10 | Help | 2 | The honesty rules are present but read as boilerplate |

Total 21/40.

## Findings, by route

P1 = blocks the checking job, P2 = slows it, P3 = polish.

- **All routes, P1: the provenance is invisible until a click.** The figure shows a number; tier (reported, contract_award, inferred, category_average, claim_extracted, gap) shows only in the panel. A checker scanning a table cannot tell a reported spend from a category average.
- **All routes, P2: four visual worlds.** /segments is near-black with random saturated node colours, /portfolio uses a marketing hero ("Supplies for children. The footprint behind them."), the rest is a card template.
- **All routes, P2: hero-metric tiles and nested cards.** Coverage (15 / 38 / 778 / 33,937) is the template big-number layout; the numbers are counts of extracted records, not findings, and invite a misreading as achievements.
- **/ (P2):** two equal cards with a black button each and a bullet list of disclaimers under; no information a returning user needs. The page is a menu.
- **/suppliers (P1):** the matrix header labels are rotated and 300 px tall, pushing data below the fold at 1440; at 390 the first screen is all coverage tiles. Cell colour (nature) is the only encoding; counts are unreadable for pale cells.
- **/map (P2):** supplier labels, spend labels and claim counts overlap curve lines; edge labels collide ("USD 482.9 M" crosses the connector); the SVG is Arial on white inside a grey page.
- **/climate (P1):** 25 ribbons overlap into a green mass; labels truncate ("Scope 3 Cat 13: Downstream Leased Ass"); "[boundary hold]" label is clipped at left ("ndary hold]"). At 390 the diagram is a 5px-text miniature.
- **/portfolio (P2):** the clearest page for checkers (table, bars with citations), but its 7-row table of "Not available in saved evidence" is the same sentence 12 times; the hero headline claims more than the data does.
- **/segments (P1):** 2,854 cited claim appearances drawn as unlabelled coloured dots; labels overlap; the dark theme is unrelated to the rest; "Full screen" button is the only hint of how to read it.
- **/hypergraph (P2):** label text on hulls collides; stat cards repeat 778 / 11 / 15 / 170 as a hero row.
- **Nav (P3):** 7 links in three groups, group labels exist only as aria-labels; the GCT brand takes the same weight as the page.
- **Type (P3):** system-ui and Arial; no tabular numerals; five near-identical grey text sizes.
- **Detector:** one finding, overused font (Arial in styles.css:89).

## What works and must survive
The honesty rules, the source panel contents, gap-as-gap, claim nature as a visible attribute, citations next to every /portfolio figure.

## Items I will decline
Recorded in REPORT.md under "critique items declined".
