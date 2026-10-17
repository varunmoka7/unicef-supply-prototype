# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Inferred from the dispatch brief, not confirmed in an interview (the brief said not to stop and ask).
- UNICEF Supply Division Vaccine Centre Contracts Manager: knows the supplier base and contracts, wants to see what each vaccine supplier says about climate before a conversation or review.
- Vaccine Centre sustainability leads and the QAPC sustainability team: check supplier climate figures and need to see where each number came from.
They work at a desk on a laptop or large monitor, sometimes on a phone in a meeting. The job is checking: open a figure, read its value, tier, source, PDF and page, decide whether to trust it.

## Product Purpose

A static prototype that shows what UNICEF Supply Division and its vaccine suppliers say in their own reports about climate and ESG. Every figure, edge and claim opens a source panel with value, tier, source, PDF and page. Success is a reader reaching the cited page in one click and never mistaking an unverified claim for a finding.

## Positioning

Provenance first: a gap is shown as a gap and never as zero, claims are marked model-extracted and not source-checked, and nothing is summed or ranked across suppliers. A dashboard that scores suppliers could not truthfully copy this.

## Operating Context

Routes: / overview, /suppliers (claims by supplier and concept, coverage), /map (spend to supplier to product tree), /climate (supplier to Scope concept hypergraph), /portfolio (Supply Division 2019 baseline, emissions by year), /segments (ESG claims graph), /hypergraph (Supply Division own-report claims in hyperedges). Data lives in buyers/unicef/ (buyer.json, data/*.json) and public/ evidence files. Source PDF pages render in a report viewer with claim highlights.

## Capabilities and Constraints

- Source panel contents are fixed: value, tier, source, PDF and page. Tiers: reported, contract_award, bcg_reported, inferred, category_average, gap, claim_extracted.
- buyers/unicef/ is not modified. No invented numbers, no placeholder data.
- Boundary-hold suppliers (GC Pharma, Biological E) are flagged.
- Figures are prototype data, not adjudicated.

## Brand Commitments

Shown as "Prototype for UNICEF Supply Division" by GoCarbonTracker (GCT). The GCT logo is /gct-logo.png. No UNICEF logo is in the repo (buyer.logo is null); none is to be invented.

## Evidence on Hand

Real data and report page images in buyers/unicef/data and public/. No testimonials, customers or benchmarks exist and none are to be added.

## Product Principles

- Every number is one click from its page.
- A gap is a gap, never zero.
- Claims are claims until source-checked, and the interface says which.
- No ranking, scoring or summing across suppliers.
- Precision over persuasion.

## Accessibility & Inclusion

Readers include non-native English speakers and phone users. Keep contrast and 44 px tap targets, keyboard-reachable figures, and source text readable in page text, not only in colour.
