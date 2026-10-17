---
name: UNICEF supply prototype (original, main cce77b6)
description: Neutral light dashboard shell with a dark claims-graph page. Scan-mode record of what the code does today.
colors:
  ink: "#17202a"
  mute: "#5b6671"
  line: "#dde2e7"
  bg: "#f6f8fa"
  surface: "#ffffff"
  accent-blue: "#0b5cad"
  own-green: "#1b7f4b"
  warn-red: "#a8321f"
  graph-night: "#0d1117"
typography:
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.45
  svg-labels:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
rounded:
  card: "12px"
  control: "6px"
  pill: "999px"
spacing:
  page-gutter: "clamp(16px, 4vw, 28px)"
---

## Overview
A light grey page (#f6f8fa) with white rounded cards, one blue accent and a green/red pair for "own" and "warn". It reads as a generic analytics template. The only route with a different world is /segments, which is a dark canvas with saturated random-looking node colours. Styles live in src/styles.css plus four small route stylesheets and a large amount of inline `style={{}}` (OrgHulls.tsx has 30).

## Colors
Neutral cool greys, blue accent (#0b5cad) for links, active nav and targets, green (#1b7f4b) for measured claims, purple and amber for commitment and projection pills on /climate, black pills for filters. Colours come from buyers/unicef/buyer.json `colours` and CSS variables in `:root`. Claim nature carries meaning (measured, commitment, target, projection) and also drives ribbon and cell colour.

## Typography
`system-ui` at 14px body, headlines 28px bold. SVG maps are set in Arial. No scale beyond a handful of sizes (11, 12, 13, 14, 16, 20, 24, 28). Numbers are not set tabular.

## Layout
Sticky-less top bar (brand, subtitle, three nav groups, 44px targets, horizontal scroll under 760px). Pages are card stacks with a fixed 400px-ish source panel on the right that pushes content (`.with-panel`). /suppliers is a heat table with rotated column headers. /map is a tree SVG with year, layout and supplier controls. /climate is a ribbon (Sankey-like) diagram. /portfolio has a 12-column hero and a table. /hypergraph is a stats row, a sidebar of counts and a hull diagram.

## Elevation & Depth
Flat: 1px #dde2e7 borders on white cards, no shadows.

## Shapes
12px card radius, 6px controls, full pills for filters. Chips and buttons are black or blue filled.

## Components
Header with grouped nav; coverage tiles (big number, label, caption); claim cell heat table; chips and pills; select dropdowns; SourcePanel (title, rows for value, tier, source, PDF and page, claim boxes grouped by year, ReportViewer for the cited page with highlights); disclaimer list repeated at the top of /map, /climate and /segments.

## Do's and Don'ts
- Do keep disclaimers and the source panel on every figure.
- Don't use the dark canvas outside /segments.
- The original has no written rules; these are observed behaviours, not intentions.
