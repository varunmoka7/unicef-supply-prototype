[dispatch] [P1-normal]

TASK: Redesign every route of this UNICEF supply prototype from scratch with the Impeccable skill (/impeccable), so Varun can compare it side by side with the original.

WHERE: ~/GTC/unicef-impeccable-trial, a throwaway copy of ~/GTC/unicef-supply-prototype (full history kept, origin remote removed, you are on branch `impeccable-trial`; `main` = original at cce77b6). Never touch ~/GTC/unicef-supply-prototype. Never add a remote, push or deploy. Vite + React; routes /, /suppliers, /map, /climate, /portfolio, /segments, /hypergraph; data in buyers/unicef/.

READERS: UNICEF Supply Division Vaccine Centre Contracts Manager, the Vaccine Centre sustainability leads, and the QAPC sustainability team. They check supplier climate figures and need to see where each number came from.

KEEP (hard rules):
- every figure, edge and claim still opens its source panel showing value, tier, source, and pdf + page
- buyers/unicef/ is not modified (check: `git diff --stat main -- buyers/unicef` is empty at the end)
- no invented numbers, no placeholder data

STEPS (all via /impeccable):
1. `npm run build`, then the Impeccable detector on src/ -> impeccable-trial/00-detector-before.md
2. /impeccable init -> PRODUCT.md (readers above)
3. /impeccable document on the current pages -> DESIGN-before.md
4. /impeccable critique on the current pages -> impeccable-trial/01-critique.md
5. /impeccable shape per route before any code -> impeccable-trial/02-shape.md
6. Build route by route. Use Sonnet subagents for the per-route builds (one subagent per route, Agent tool, model sonnet). Commit after each route on branch impeccable-trial.
7. Detector again -> impeccable-trial/03-detector-after.md; for each remaining finding, say why it stays.
8. Checks: `npm run build` exits 0; `npm test` and paste its summary line; on each of the 7 routes click a figure and confirm in the page text (document.body.innerText, not only screenshots) that the source panel shows value, tier, source, pdf+page; do this at 1440 px and 390 px.
9. Serve: `npx vite preview --port 4319 --strictPort` (leave it running).

OUTPUT: impeccable-trial/REPORT.md: changes per route; detector findings before and after; critique items declined, with reasons; the check results (build, test summary line, 7 routes x 2 widths table); anything that broke.

REPORT: end REPORT.md with `## Report` (done, found, left, what Varun must decide) and `## Next` (one imperative action per line, max 100 chars). Last line of the file: `STATUS: done` or `STATUS: blocked <reason>`.
