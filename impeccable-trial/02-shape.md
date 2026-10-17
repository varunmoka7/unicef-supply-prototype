# Shape: direction and per-route briefs

Mode: Operate (the reader checks figures). Build path: code-first (Operate is always code-first). Interview: none; the dispatch brief said not to stop and ask, so the product record in PRODUCT.md is inferred from the brief and labelled so. Direction was dealt by `impeccable concept-seed --scope direction --mode operate` (assigned grammar: index 4 of my own grounded list); no challenger material was borrowed.

## Grounded list (audience's own world), ordered by resonance
1. Audit workpaper: ruled columns, tick marks, cross-reference to the source document.
2. Statistical yearbook table: footnote marks, hairline rules.
3. Archive finding aid: fonds, series, item, with provenance at every level.
4. **Vaccine carton and vial label (assigned).** The thing this division buys, labelled the way UNICEF labels it: a ruled field per datum, field name small above, value large below, a code box for status, nothing decorative.
5. Cartographic atlas plate.
6. Pharmacopoeia monograph.
7. Exhibit bundle with tabs.

## Direction contract

THESIS: Every figure is a labelled field on a carton label: name above, value below, its tier and its pdf and page printed on the field itself, not behind a click. Refuses the card-and-hero-metric dashboard template.

OWN-WORLD: Cool paper ground #F4F6F5, ink #101820, 1.5px ink outer rules and 1px #C5CDD2 inner rules, 0 to 2px radius, no shadows, no gradients. One interactive blue #005F90. Claim nature keeps four hues (measured green, commitment violet, target blue, projection amber) used only for nature. Tier is shown by a boxed code whose border encodes how it was obtained: solid = stated by a source, dashed = derived or averaged, diagonal hatch = gap, dotted = model-extracted and not source-checked. Public Sans (self-hosted, variable), tabular figures on every number, scale 12 / 13 / 15 / 18 / 24 / 32. Top bar is a solid ink band.

STORY: The reader opens a page, sees fields with their tier and citation beside every number, spots the hatched gaps and dashed derivations at a glance, and opens the source panel to reach the page image.

FIRST VIEWPORT: Ink top bar (brand left, one row of seven links, active link has a thick white underline). Beneath it a page title row (h1 left, one-sentence lede) and the page's working surface starts within 220 px of the top at 1440; the three honesty rules live once in a collapsed "How to read this" strip in the title row, not repeated as a bullet list.

FORM: Carton label, position 4 of my list; seed reference unavailable in output, `seed: none (unavailable)`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance. (No rasters ship. Finish review and DESIGN.md are handled in REPORT.md; see "what is left".)

## Shared pieces (built once, before the routes)
- `src/styles.css`: tokens, top bar, `.page`, `.page-head`, `.field` (label + value + cite), `.tier` boxed code, `.nature` swatch, `.rule-strip` for the honesty rules, tabs/chips/selects, source panel.
- `src/components/PageHead.tsx`: h1, lede, collapsible rules strip. Replaces the repeated `.ps-intro` bullets.
- `SourcePanel`: styled as a label with VALUE / TIER / SOURCE / PDF · PAGE fields. Same data, same text, same props.

## Per route
- **/ Overview.** A directory, not two promo cards: a ruled table of the seven routes with one line each of what is on it and the question it answers, grouped as in the nav. The three honesty rules appear here in full once, as numbered label text.
- **/suppliers.** Matrix of supplier rows by concept columns. Column headers rotated but capped in height with the full name in the title and the cell's aria-label; sticky first column; the coverage tiles collapse into a single ruled strip of four fields (counts labelled as records extracted, not findings). Cell count printed in ink on a nature-tinted ground with enough contrast; no-claim cells hatched.
- **/map.** Tree stays. Light ground, ink strokes, nature-coloured edges; edge and node labels get a paper-coloured halo and are offset so they never cross connectors; the spend label carries its tier as a boxed code.
- **/climate.** Ribbon diagram stays. Ribbons thinner with lower opacity so overlaps read; labels never truncate (wrap or widen the label column); boundary-hold shown as a boxed tag, not bracketed text clipped at the left; legend sits above the diagram; on 390 px the diagram scrolls sideways at a readable size.
- **/portfolio.** The page that already works. Drop the marketing headline in favour of a plain title; the 2019 baseline as one large field with its citation; the year table collapses the repeated "Not available in saved evidence" rows into one explicit gap row spanning 2020 to 2025 with a hatched cell; bars keep their citations.
- **/segments.** Dark canvas goes light and joins the system. Nodes coloured by claim nature only (the same four hues), concept labels outside collision, a visible key; stats strip as one ruled row.
- **/hypergraph.** Stats row becomes one ruled strip; hull labels collision-managed; side counts become a ruled field list.

## Hard rules for every route
Source panel on every figure, edge and claim; buyers/unicef/ untouched; no invented numbers; existing tests still pass; DOM hooks the tests use (`g[role=button]`, `circle[role=button]`, `.seg-stats`, `.seg-hub`, `.edge path`, `.report-highlight`, `data-id`) stay.
