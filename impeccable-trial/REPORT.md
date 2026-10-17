# Impeccable trial: UNICEF supply prototype

Branch `impeccable-trial` (original = `main` at cce77b6). Direction: "carton label", Operate mode, code-first. Served at http://localhost:4319 (`npx vite preview --port 4319 --strictPort`, left running). Compare with the original by checking out `main`, building and previewing on another port.

## Changes per route

Shared first (commit "Foundation"): new tokens in `src/styles.css` (paper ground, ink rules, no shadows, square corners, Public Sans self-hosted, tabular numbers), ink top bar, source panel restyled as a label (same rows, same data, tier badge border varies by tier), new `PageHead` (title, lede, the three honesty rules once in a "How to read this" disclosure instead of a bullet list repeated per page), nature colours as `--n-*` variables.

| Route | What changed |
|---|---|
| / | Two promo cards with buttons became one ruled table of the seven pages with a line each; the three rules appear once in full. Two link names kept as "Open supplier intelligence" and "Open claims hypergraph" because an existing test pins them. |
| /suppliers | Coverage tiles became one ruled strip, captioned as records extracted, not findings. Matrix: rotated headers capped at 140px (full name in title and aria-label), sticky supplier column, hatched empty cells, tinted cells with ink text plus a bottom-rule style per nature, 44px cells on mobile. Spend bars and network flattened; tier shown as a boxed code. |
| /map | Light ground, ink edges (dashed for gap, inferred, category average), spend label carries a boxed tier code, labels get a paper halo, controls in one row, SVG scrolls sideways on mobile at 11 to 13px text. Arial removed. |
| /climate | Ribbons thinner at 0.3 opacity, label column widened so nothing truncates, "[boundary hold]" became a boxed tag, legend and filters in one row above the diagram, diagram scrolls sideways on mobile, repeated disclaimers removed. |
| /portfolio | Marketing headline replaced by "Division portfolio" with the old intro as lede. 2019 baseline is one large field with its citation. The repeated "Not available in saved evidence" rows are one hatched row for 2020 to 2025 ("Not zero"). Bars keep values and citations. |
| /segments | Dark canvas replaced by light. Dots coloured by claim nature only when all of a dot's claims share one nature, grey when mixed, open dashed circle for none; visible key; stats as one ruled strip. |
| /hypergraph | Four stat cards became one strip ("Hyperedges" relabelled "Claim groups"). Sidebar counts are ruled lists. Pillar colours changed to teal, magenta and slate with solid, dashed or dotted outlines so they do not clash with the nature hues and do not rely on colour. Label placement pass added. 30 inline styles moved to classes. |

Tests edited, with reason: `Portfolio.test.tsx` (counts of "Not available in saved evidence" 20 to 3 and 21 to 4, because the repeated rows were merged), `ClimateHypergraph.test.tsx` (`[boundary hold]` to `boundary hold`, brackets removed). No other test changed.

## Detector

Before: 1 finding, overused-font (Arial, `src/styles.css:89`). After: 0. Files: `00-detector-before.md`, `03-detector-after.md`. Nothing remains to justify. The detector reads source patterns only; it cannot see the label overlaps listed under "left".

## Critique items declined (details in 01-critique.md)

- Rename "hypergraph" in the nav ("Climate hypergraph", "Claims hypergraph"): `Climate.test.tsx` pins the seven nav labels, and renaming a test contract was outside "redesign". Page titles use plain words ("Supplier climate claims") but the nav and `aria-label="Climate hypergraph"` still say hypergraph.
- Cross-route "jump to this supplier": a new feature, not a redesign.
- Relabel "Contexts" on /hypergraph: the agent could not tell from the data what the count means, and I did not invent a definition.
- Show tier on every figure: done where the data has a tier (spend on /suppliers and /map). Claim figures carry a nature, not a tier, in the data.
- Drop the coverage counts: kept, because they are real record counts; captioned as not findings.

## Checks

- `npm run build`: exit 0 (vite's chunk-size warning is unchanged from the original).
- `npm test`: `Test Files  11 passed (11)` / `Tests  58 passed (58)`.
- `git diff --stat main -- buyers/unicef`: empty.
- Source panel, clicked via Playwright (Chrome) and read from the panel's `innerText`; no horizontal page overflow at either width.

| Route | 1440 px | 390 px |
|---|---|---|
| / | no figure, nothing to click (directory page) | same |
| /suppliers | spend edge: value, tier, source, no pdf/page (source is a CSV line). Matrix cell: note, counting method, evidence | same |
| /map | spend node: value, tier, source, no pdf/page (CSV line) | same |
| /climate | evidence: nature, claim text, `GSK_Responsible_Business_Report_2025.pdf · page …` | same |
| /portfolio | no source panel; figures link to saved excerpts ("Scope 3 baseline report, PDF p. 4 · saved excerpt", 21 links, href checked) | same |
| /segments | evidence: nature, claim text, pdf · page | same |
| /hypergraph | evidence: nature, claim text, pdf · page | same |

Reading the table honestly: no single click shows all four of value, tier, source and pdf+page. Spend figures have value, tier and source but their source is a CSV, so no pdf page exists. Claims have nature, text, pdf and page but no value or tier row. /portfolio uses links to excerpts and no panel, and / has no figures. This is how the original behaves too (SourcePanel logic is unchanged); I did not change what the data holds.

## Anything that broke

- Parallel route agents saw each other's half-written files (a missing CSS import, a transient failing router test). Resolved once all were committed; the final suite is green.
- A first sed to rename two links failed silently inside a `&&` chain and left the router test red until I redid it with Python.
- The gstack `browse` binary has no Chromium installed here; I used Playwright with system Chrome instead.

## Report

Done: PRODUCT.md, DESIGN-before.md, critique, shape, all seven routes rebuilt and committed (one commit per route plus a foundation commit), detector 1 to 0, build and tests green, buyers/unicef untouched, preview running.

Found: the original has four visual worlds and a heatmap-style coverage hero; tier was invisible until a click. The data only holds a tier on spend, and pdf and page only on claims.

Left: some labels still touch dots on /segments and some diamond labels crowd the centre of /hypergraph; a spend curve can still pass near a label on /map; the 390px nav scrolls with the left item clipped (as in the original); no finish review or DESIGN.md for the new world was run (the brief asked for DESIGN-before only); network SVG node colours on /suppliers are still hard-coded hex; old `.map-*` rules remain in `styles.css`.

Decide: whether the nav and aria-label may drop "hypergraph" (needs a test change); whether the mixed-nature grey dot on /segments is acceptable; PRODUCT.md and the direction are inferred from the brief without an interview, so confirm the readers and the carton-label direction before anyone builds on them; Public Sans was added as a dependency.

## Next
Open http://localhost:4319 and compare each route with main
Confirm or replace the carton-label direction in impeccable-trial/02-shape.md
Say whether the nav may drop the word hypergraph
Run /impeccable document to write DESIGN.md for the new look
Fix remaining label overlaps on /segments and /hypergraph

STATUS: done
