# UNICEF Supply Division prototype (GoCarbonTracker)

A static React and Vite app that shows what UNICEF Supply Division and its vaccine suppliers say in their own reports about climate and ESG. Every claim links to the PDF and page it came from. Figures are prototype data and have not been adjudicated.

It was exported from `apps/public-sector` in GoCarbonTracker/go-carbon-insights at `50cc9caf6`.

## Questions it answers

The pages are built around three questions. [QUESTIONS.md](QUESTIONS.md) answers each one and explains which hypergraph structure sits behind it.

1. What drives the 2019 Scope 3 baseline? (`/portfolio`)
2. Who carries UNICEF vaccine spend, and what do those suppliers say about their climate performance? (`/suppliers`)
3. Why are Supply Division Scope 1 and Scope 2 missing? (`/portfolio`)

## Pages

| Route | What it shows |
|---|---|
| `/` | Landing page with links to the two parts below |
| `/suppliers` | Vaccine suppliers: UNICEF spend for 2019, 2024 and 2025 next to what their reports say on SBTi, operations, value chain and energy |
| `/map` | Supply chain map of suppliers, products and countries |
| `/climate` | Climate hypergraph: which of 22 climate concepts each supplier discusses |
| `/segments` | Supplier ESG claims grouped by segment |
| `/hypergraph` | Claims hypergraph of UNICEF Supply Division's own reports, ESG and supply operations kept apart |
| `/portfolio` | Division portfolio: 2019 emissions baseline, annual procurement, supplier reach |

## Data

The app reads prebuilt JSON from `buyers/unicef/`:

| File | Built by | Contents |
|---|---|---|
| `buyer.json` | no builder writes it | supplier list, climate concepts, disclaimers |
| `data/suppliers.json` | `scripts/build_suppliers.py` | supplier profiles with spend and own-report claims |
| `data/spend.json` | `scripts/build_spend.py` | Annex 2 spend records by year |
| `data/climate.json` | `scripts/build_climate.py` | supplier by climate concept cells, joined through hyperedges |
| `data/org_hypergraph.json` | `scripts/build_org_hypergraph.py` | Supply Division claims hypergraph |
| `data/map.json` | `scripts/build_map.py` | supply chain map |

`public/portfolio-evidence/` holds the source excerpts that `/portfolio` links to.

The `scripts/` builders only run inside the main go-carbon-insights repo, where the knowledge bases and the Annex 2 research files live. Run them with `services/hypergraph-rag/.venv/bin/python3`, and set `PSP_KB_ROOT` when working from a worktree.

## Run

```sh
npm install
npm run dev      # local dev server
npm test         # vitest
npm run build    # typecheck and build to dist/
```

`vercel.json` deploys `dist/` as a single-page app.
