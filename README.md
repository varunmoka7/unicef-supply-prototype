# UNICEF Supply Division prototype (GoCarbonTracker)

A static React and Vite app that shows what UNICEF Supply Division and its vaccine suppliers say in their own reports about climate and ESG. Every claim links to the PDF and page it came from. Figures are prototype data and have not been adjudicated.

Live: [unicef-supply-prototype.vercel.app](https://unicef-supply-prototype.vercel.app)

![The /suppliers page: UNICEF vaccine spend by supplier next to what each supplier's reports say on SBTi, operations, value chain and energy](docs/suppliers.png)

It was exported from `apps/public-sector` in [GoCarbonTracker/go-carbon-insights](https://github.com/GoCarbonTracker/go-carbon-insights) at `50cc9caf6`.

## UNICEF Supply Division's ESG position

This is what the Supply Division's own reports say, as saved in the prototype. Each point links to the excerpt it comes from.

- **One emissions baseline, for 2019 and for Scope 3 only.** The Supply Division's supply-chain emissions were estimated at 3,869 ktCO₂e against US$3.8 billion of 2019 spend ([excerpt](public/portfolio-evidence/d9c7221cd65b95cd.txt), [category table](public/portfolio-evidence/baseline-p012.txt)). Vaccines account for about 71% of that and nutrition for about 11%.
- **No Supply Division Scope 1 or Scope 2 figure.** The baseline excludes both. The only operational figure in it is a UNICEF-wide 0.03 MtCO₂e for Scope 1 and 2 combined, with no division share ([excerpt](public/portfolio-evidence/baseline-p004.txt)). The saved evidence contains no later annual Supply Division emissions.
- **No published UNICEF science-based target yet.** The baseline report advises UNICEF to ask its largest suppliers for SBTs "even before it has itself aligned with the Science-based Targets Initiative" ([excerpt](public/portfolio-evidence/d26f3b5a500760ef.txt)). The 2025 annual report says UNICEF "initiated a project to align decarbonization targets" with SBTi ([excerpt](public/portfolio-evidence/2f4b39cdfe3aaf48.txt)).
- **Supplier engagement is the stated lever.** The baseline names 18 suppliers that drive the next 25 to 40% of Scope 3 emissions and do not yet have SBTs as the group to engage more deeply ([excerpt](public/portfolio-evidence/6b1fd37e7dd9e0e4.txt)). The 2025 annual report describes industry consultations and supplier sustainability surveys.

[QUESTIONS.md](QUESTIONS.md) has the full figures and sources.

## How this tool helps

The Supply Division's climate picture is spread across a baseline study, yearly annual reports, procurement annexes and the sustainability reports of each supplier. This prototype puts them side by side:

- Spend and climate statements sit on one row per supplier, so you can see which large vaccine suppliers report emissions and targets and which say nothing in their saved reports. Two suppliers that together received over US$116 million in 2025 have no statements on the four climate topics shown.
- Every figure opens the passage and page it came from, so a reader can check a claim instead of trusting the summary.
- Gaps are shown as gaps. A missing year or scope reads "not in the source", never zero.
- Claims are grouped in a hypergraph that keeps each statement together with its company, topic, year and source. [QUESTIONS.md](QUESTIONS.md) explains why that matters here.

It is a reading tool for prototype data. It does not compute emissions or score suppliers.

## Questions it answers

[QUESTIONS.md](QUESTIONS.md) answers each one and names the hypergraph structure behind it.

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

Built with React 18, React Router 6, d3 7, Vite 7 and Vitest.

## Getting the code

The repository is private. Ask for access, then:

```sh
git clone https://github.com/varunmoka7/unicef-supply-prototype.git
cd unicef-supply-prototype
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or later in the 20.x line, or 22.12 or later. Vite 7 refuses to start on older versions. Check with `node --version`.
- npm, which comes with Node.

## Run locally

```sh
npm install
npm run dev
```

The dev server prints its URL, normally `http://localhost:3100`. If port 3100 is taken, Vite picks the next free port. Open `/suppliers` to check it works: you should see the supplier table above.

## Test and build

```sh
npm test         # vitest, the page tests
npm run build    # typecheck, then build to dist/
```

`scripts/test_builders.py` tests the Python data builders. It only runs inside go-carbon-insights, because the builders read files at import time that are not in this repo.

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

This repo ships prebuilt data only. The knowledge bases, source PDFs and extraction pipeline stay in GoCarbonTracker, so a clone can run and browse the app but cannot rebuild the data. The `scripts/` builders run inside go-carbon-insights with `services/hypergraph-rag/.venv/bin/python3`; set `PSP_KB_ROOT` when working from a worktree.

## Deploy

Vercel builds the site with `npm run build` and serves `dist/` as a single-page app (`vercel.json`). A push to `main` deploys to production, and every pull request gets a preview URL.

## References

- [GoCarbonTracker](https://gocarbontracker.net), the project this prototype comes from.
- [GoCarbonTracker/go-carbon-insights](https://github.com/GoCarbonTracker/go-carbon-insights), the main repository with the knowledge bases and the extraction pipeline. Private.

## License

Private prototype. Not licensed for reuse.
