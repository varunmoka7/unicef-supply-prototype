# The three questions

The prototype asks three questions in its own pages. Two sit on `/portfolio` and one on `/suppliers`. Each answer below uses the figures the app already shows, says where they come from, and names the hypergraph structure behind it.

All figures are prototype data taken from the reports. Nobody has adjudicated them.

## 1. What drives the 2019 baseline?

Asked on `/portfolio` (`src/pages/Portfolio.tsx`).

Purchased goods and services (GHG Protocol category 3.1) make up 3,555 of the 3,869 ktCO₂e in the Supply Division's 2019 Scope 3 baseline. Within that, vaccines dominate at 2,729 ktCO₂e, about 71% of the total. Nutrition follows with 428 ktCO₂e (11%) and insecticidal nets with 173 ktCO₂e (4%). Transport and distribution adds 239 ktCO₂e.

Emissions do not track spend. Vaccines took US$1,656 million of spend and produced 2,729 ktCO₂e. Cash and voucher assistance took US$214 million and produced 69 ktCO₂e. Bednets and insecticides took US$94 million and produced 173 ktCO₂e. Ranked by spend, the commodity rows come out in a different order from the same rows ranked by emissions.

Sources: Scope 3 baseline report, PDF p. 12 (shares) and the BCG compendium (13 commodity rows). The published category values do not sum exactly to the stated total.

**Hypergraph used:** the `esg:scope_3_baseline` hyperedge in `buyers/unicef/data/org_hypergraph.json`, built by `scripts/build_org_hypergraph.py`. It joins UNICEF Supply Division, the Scope 3 baseline concept, the GHG Protocol, SBTi and the Paris Agreement, and the two baseline PDFs, and carries 191 claims. The `ghg_emissions` and `abatement_costs` hyperedges hold the related claims.

**Why it fits:** a baseline figure such as "vaccines were 71% of 2019 Scope 3" is one statement that ties together a commodity, a scope category, a year, a method and a source page. Split into pairwise edges (vaccines to Scope 3, Scope 3 to 2019, vaccines to the report), that statement can be reassembled wrongly, for example by pairing the vaccine share with a 2024 spend figure from another report. A hyperedge keeps the members of the statement together, so the page can show the share next to the exact PDF page it came from.

## 2. Who carries UNICEF vaccine spend, and what do they say about their climate performance?

Asked on `/suppliers` (`src/pages/Suppliers.tsx`).

Two suppliers carry most of it. In 2025 Pfizer received US$388.3 million and GSK US$304.4 million. Biological E (US$232.5 million), Merck & Co (US$186.9 million) and Sanofi (US$106.5 million) follow. LG Chem, Bio Farma and Bilthoven Biologicals each received between US$50 million and US$81 million.

| Supplier | 2025 spend (US$ m) | SBTi | Operations | Value chain | Energy |
|---|---|---|---|---|---|
| Pfizer | 388.3 | measured, future | measured, future | measured, future | measured |
| GSK | 304.4 | measured, future | measured, future | measured, future | measured |
| Biological E | 232.5 | none | measured, future | measured, future | measured, future |
| Merck & Co | 186.9 | measured, future | measured, future | measured, future | measured, future |
| Sanofi | 106.5 | measured, future | measured, future | measured, future | measured, future |
| LG Chem | 80.5 | none | measured | measured | measured |
| Bio Farma | 62.4 | none | none | none | none |
| Bilthoven Biologicals | 53.7 | none | none | none | none |

"Future" means targets, commitments or projections. "None" means nothing in the saved reports, which is different from saying the supplier has no climate work.

Four of the five largest suppliers mention SBTi and report both measured figures and forward statements on operations and value-chain emissions. Biological E, the third largest, reports on emissions and energy but has no SBTi mention in its saved reports, and its reporting boundary is not resolved: check which entity a figure covers before using it. Bio Farma and Bilthoven together received over US$116 million in 2025, and the saved reports say nothing on these four climate topics for either of them. LG Chem reports measured figures only, with no targets.

Sources: spend is the Annex 2 parent total (`research/annex2/suppliers-by-year.csv` in the main repo). Climate marks are model-extracted from each supplier's own reports and link to the PDF and page.

**Hypergraph used:** `buyers/unicef/data/climate.json`, built by `scripts/build_climate.py` from the hypergraph-RAG knowledge base. A claim lands in cell (supplier, concept) when two hyperedges meet on the same report context: a `company_context` hyperedge places the context under the supplier, and a `context_concepts` hyperedge tags the context with the climate concept.

**Why it fits:** a report context is a passage with many members at once: a company, a year, several concepts, a claim nature (measured or target) and a page. The cell join asks which contexts sit in both groups, which is a question about group membership. A plain graph would need a context node with an edge to each member, and the "measured versus target" label would then belong to no edge in particular.

**Known weakness:** a context tag is broad. One context can carry many concepts, so a claim can land in a cell its text does not support. The AJ Vaccines energy cell includes a claim about a safe working environment. `build_org_hypergraph.py` already guards against this by also requiring the claim text to match the concept's vocabulary. `build_climate.py` does not yet do this.

## 3. Why are Supply Division Scope 1 and Scope 2 missing?

Asked on `/portfolio` (`src/pages/Portfolio.tsx`).

The Supply Division baseline estimates supply-chain Scope 3 only and leaves out Scope 1 and Scope 2. The same report gives a combined UNICEF-wide Scope 1 and 2 figure of 0.03 MtCO₂e for 2019. That figure has no division allocation and no split between the two scopes, so it cannot stand in for Supply Division Scope 1 or Scope 2. The saved evidence holds no later annual Supply Division emissions.

Source: Scope 3 baseline report, PDF p. 4.

**Hypergraph used:** the `esg:scope_1_2` hyperedge in `org_hypergraph.json`. It holds only 19 claims, and its only source members are the two Scope 3 baseline PDFs. The annual reports never join it.

**Why it fits:** the gap shows in the shape of the hyperedge. A small hyperedge whose sources are only the baseline documents says that Scope 1 and 2 appear in passing in one study and nowhere in the division's yearly reporting. More importantly, the 0.03 MtCO₂e figure belongs to a group of members (UNICEF as a whole, Scope 1 and 2 combined, 2019, one page). A plain edge from "UNICEF Supply Division" to "Scope 1 and 2" would drop the boundary and suggest the division has its own figure. The same boundary problem is why `/suppliers` flags Biological E and GC Pharma.

## What a hyperedge captures that a plain edge cannot

A graph edge joins two things. A hyperedge joins any number of them as one relation. In this prototype the relations that matter are claims and report passages, and each has more than two parts: who said it, about which topic, for which year and entity boundary, whether it is measured or a target, and on which page. Breaking such a relation into pairs loses which pairs belonged together, so figures from different statements can be recombined into a claim no source made.

Hyperedges also make group-level questions direct. "Which contexts are about this supplier and also about Scope 3?" is an intersection of two hyperedges. "Which documents support this topic?" is the member list of one hyperedge. The `/hypergraph` and `/climate` pages draw these groups as hulls, with every hull linking back to its claims.

The advantage has limits. Dai and Gao (*Hypergraph Computation*, 2023, ch. 2) show that a hypergraph with plain binary memberships behaves like a weighted graph under a random walk, so for propagation and ranking it gives nothing a well-weighted graph could not. It goes beyond a graph when membership carries weight that depends on the group, for example when a claim matters more in one context than another, or when the group itself is the fact being recorded. This prototype uses hyperedges for the second reason: to keep each statement and its provenance together. It does not run hypergraph learning such as label propagation or HGNN. Those methods would become useful for questions the data cannot yet answer directly, such as estimating climate positions for the suppliers whose saved reports say nothing.
