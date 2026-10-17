import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, scaleLinear, type SimulationNodeDatum } from "d3";
import { useBuyerJson, type Buyer, type Evidence, type Figure } from "../lib/buyer";
import type { PanelItem } from "../components/SourcePanel";
import PageHead from "../components/PageHead";
import "./Suppliers.css";

// Landing dashboard: coverage, claims grid, spend by tier, supply-chain network, all read from the five buyer JSON files.

type Nature = "actual" | "commitment" | "target" | "projection";
const NATURES: Nature[] = ["actual", "commitment", "target", "projection"];
const NATURE_LABEL: Record<Nature, string> = { actual: "measured", commitment: "commitment", target: "target", projection: "projection" };
const YEARS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025"];
const CA = "ca";
const NO_PRICE = /\b(price|prices|pricing|fee|fees|tariff|per dose)\b/i;

interface Spend { records: { name: string; parent: string; category: string; spend_usd: Record<string, Figure> | null; contract_awards_2017_2020?: Figure | null }[] }
interface Cell { supplier: string; concept: string; contexts: number; claims: number; natures: Record<Nature, number>; items: (Evidence & { nature: string })[] }
interface Climate { suppliers: { id: string; name: string; boundary_hold: boolean }[]; concepts: { id: string; label: string; group: string }[]; cells: Cell[] }
interface Stats { claims: number; documents: number; contexts: number }
interface OrgHypergraph { stats: { esg: Stats; operations: Stats } }
interface MapData {
  nodes: { id: string; kind: string; label: string }[];
  edges: { from: string; to: string; kind: string; year?: string; figure: Figure; claims?: Evidence[] }[];
}
interface Suppliers { profiles: unknown[] }

const fN = new Intl.NumberFormat("en").format;
const fUsd = (v: number) => "$" + fN(Math.round(v));
const priceFree = (e: Evidence) => !NO_PRICE.test(e.text);

function Coverage(props: { suppliers: Suppliers; spend: Spend; org: OrgHypergraph }): JSX.Element {
  const { suppliers, spend, org } = props;
  const { esg, operations } = org.stats;
  const tiles: [string, string, string][] = [
    [fN(suppliers.profiles.length), "suppliers profiled", "suppliers.json"],
    [fN(spend.records.length), "supplier-spend records", "spend.json, a tier on every figure"],
    [fN(esg.claims), "ESG claims extracted", `${fN(esg.documents)} documents, ${fN(esg.contexts)} contexts`],
    [fN(operations.claims), "operations claims extracted", `${fN(operations.documents)} documents, ${fN(operations.contexts)} contexts`],
  ];
  return (
    <section aria-labelledby="ld-cov">
      <h2 id="ld-cov">Coverage</h2>
      <div className="field-row">
        {tiles.map(([n, label, sub]) => (
          <div className="field" key={label}>
            <span className="f-value">{n}</span>
            <span className="f-name">{label}</span>
            <span className="f-cite">{sub}</span>
          </div>
        ))}
      </div>
      <p className="ld-cap">Counts are records extracted from the files, not findings. The ESG and operations sets are separate document sets and are not added together.</p>
    </section>
  );
}

function Grid(props: { climate: Climate; onOpen: (i: PanelItem) => void }): JSX.Element {
  const { climate, onOpen } = props;
  const cells = useMemo(() => new Map(climate.cells.map((c) => [c.supplier + "|" + c.concept, c])), [climate]);
  const total = useMemo(() => climate.cells.reduce((a, c) => a + c.claims, 0), [climate]);
  const open = (supplier: string, label: string, cell: Cell) => {
    const evidence = cell.items.filter(priceFree);
    const isScope = climate.concepts.find((c) => c.id === cell.concept)?.group === "scope";
    onOpen({
      title: `${supplier}: ${label}`,
      evidence,
      scope: isScope ? { supplier: cell.supplier, concept: cell.concept } : undefined,
      note: `${fN(cell.claims)} extracted claims in ${fN(cell.contexts)} contexts (${NATURES.map((n) => `${NATURE_LABEL[n]} ${cell.natures[n]}`).join(", ")}). ${fN(evidence.length)} claim texts are listed in the file. Extracted, not source-checked.`,
    });
  };
  return (
    <section aria-labelledby="ld-grid">
      <h2 id="ld-grid">Claims by supplier and concept</h2>
      <p className="ld-cap">
        Each cell is the number of extracted claims. Tint and bottom rule show the most frequent nature in the cell. Claims are extracted statements and not all have been checked against the source page.
      </p>
      <p className="ld-legend">
        {NATURES.map((n) => (
          <span key={n}><i className={`ld-sw ld-n-${n}`} />{NATURE_LABEL[n]}</span>
        ))}
        <span><i className="ld-sw ld-hatch" />no extracted claim</span>
      </p>
      <div className="ld-scroll">
        <table className="ld-grid">
          <thead>
            <tr>
              <th className="ld-corner" />
              {climate.concepts.map((c) => <th key={c.id} scope="col" title={c.label} aria-label={c.label}><span>{c.label}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {climate.suppliers.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.name}{s.boundary_hold ? " †" : ""}</th>
                {climate.concepts.map((c) => {
                  const cell = cells.get(s.id + "|" + c.id);
                  if (!cell) return <td key={c.id} className="ld-empty gap-cell" aria-label="no extracted claim" />;
                  const top = NATURES.reduce((a, n) => (cell.natures[n] > cell.natures[a] ? n : a), "actual" as Nature);
                  const tint = cell.claims === 0 ? 0 : Math.round(8 + 22 * Math.min(1, Math.sqrt(cell.claims / 120)));
                  return (
                    <td key={c.id}>
                      <button
                        type="button"
                        className={cell.claims ? `ld-n-${top}` : undefined}
                        aria-label={`${s.name}, ${c.label}: ${cell.claims} extracted claims`}
                        style={cell.claims ? ({ "--tint": `${tint}%` } as CSSProperties) : undefined}
                        onClick={() => open(s.name, c.label, cell)}
                      >
                        {fN(cell.claims)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ld-cap">
        Hatched cell: no extracted claim. This does not mean no action was taken. † supplier flagged boundary_hold in the file. The cell counts add up to {fN(total)} claims
        across {fN(climate.cells.length)} supplier-concept cells; the ESG set in the coverage strip reports a different count. They have not been reconciled.{" "}
        <Link to="/climate">Open the climate hypergraph</Link>
      </p>
    </section>
  );
}

function SpendBars(props: { spend: Spend; view: string; onView: (v: string) => void; onOpen: (i: PanelItem) => void }): JSX.Element {
  const { spend, view, onView, onOpen } = props;
  const isCa = view === CA;
  const rows = useMemo(() => {
    const figureOf = (r: Spend["records"][number]): Figure | null => (isCa ? r.contract_awards_2017_2020 ?? null : r.spend_usd?.[view] ?? null);
    return spend.records
      .map((r) => ({ r, fig: figureOf(r) }))
      .sort((a, b) => (b.fig?.value ?? -1) - (a.fig?.value ?? -1) || a.r.name.localeCompare(b.r.name));
  }, [spend, view, isCa]);
  const max = Math.max(1, ...rows.map((x) => x.fig?.value ?? 0));
  const x = scaleLinear().domain([0, max]).range([0, 100]);
  return (
    <section aria-labelledby="ld-spend">
      <h2 id="ld-spend">Spend by supplier and tier</h2>
      <div className="ld-ctl">
        <label htmlFor="ld-basis">Spend basis</label>
        <select id="ld-basis" value={view} onChange={(e) => onView(e.target.value)}>
          {YEARS.map((y) => <option key={y} value={y}>Annual spend {y}</option>)}
          <option value={CA}>Contract awards 2017-2020 (term total)</option>
        </select>
      </div>
      <p className="ld-cap">
        {isCa
          ? "Contract award value over the contract term, hatched because it is not annual spend. A supplier without one has no bar."
          : `UNICEF Annex 2 annual spend for ${view}. Highest first. A supplier with no figure for the year reads "not in the annex", which is not zero.`}
      </p>
      <ul className="ld-bars">
        {rows.map(({ r, fig }) => (
          <li key={r.name}>
            <span className="ld-bar-name">{r.name}</span>
            {fig && fig.value != null ? (
              <button
                type="button"
                className="ld-bar"
                aria-label={`${r.name}, UNICEF ${isCa ? "contract awards 2017-2020" : "spend " + view}: ${fUsd(fig.value)}, tier ${fig.tier}`}
                onClick={() => onOpen({ title: `${r.name}: ${isCa ? "contract awards 2017-2020" : "UNICEF spend " + view}`, figure: fig })}
              >
                <span className="ld-track"><i className={isCa ? "ld-hatch ld-fill" : "ld-fill"} style={{ width: `${Math.max(1, x(fig.value))}%` }} /></span>
                <span className="ld-val"><b>{fUsd(fig.value)}</b> <span className={`tier ${fig.tier}`}>{fig.tier}</span></span>
              </button>
            ) : (
              <span className="ld-miss">{isCa ? "no contract award recorded" : "not in the annex"}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="ld-legend">
        <span><i className="ld-sw ld-solid" />reported (UNICEF Annex 2, annual)</span>
        <span><i className="ld-sw ld-hatch" />contract award (term total, not annual spend)</span>
      </p>
      <p className="ld-cap">Annual spend and contract-award totals are different measures and are not added together.</p>
    </section>
  );
}

type Sim = SimulationNodeDatum & { id: string; kind: string; label: string };
const NODE_COLOUR: Record<string, string> = { buyer: "#17202a", supplier: "#0b5cad", country: "#1b7f4b", product: "#a8321f" };

function Network(props: { map: MapData; year: string; onOpen: (i: PanelItem) => void }): JSX.Element {
  const { map, year, onOpen } = props;
  const [show, setShow] = useState<"countries" | "products">("countries");
  const W = 760;
  const H = 560;
  const g = useMemo(() => {
    const keep = show === "products" ? "product" : "country";
    let rest = map.edges.filter((e) => e.kind === keep);
    if (show === "products") {
      const tot = new Map<string, number>();
      rest.forEach((e) => tot.set(e.to, (tot.get(e.to) ?? 0) + (e.figure.value ?? 0)));
      const top = new Set([...tot].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id));
      rest = rest.filter((e) => top.has(e.to));
    }
    const edges = map.edges.filter((e) => e.kind === "spend" && e.year === year).concat(rest);
    const ids = new Set(edges.flatMap((e) => [e.from, e.to]));
    const byId = new Map(map.nodes.map((n) => [n.id, n]));
    const nodes: Sim[] = [...ids].map((id) => ({ id, kind: byId.get(id)?.kind ?? "unknown", label: byId.get(id)?.label ?? id }));
    const links = edges.map((e) => ({ source: e.from, target: e.to, edge: e }));
    forceSimulation(nodes)
      .force("link", forceLink(links).id((n) => (n as Sim).id).distance(show === "products" ? 90 : 70))
      .force("charge", forceManyBody().strength(-170))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide(16))
      .stop()
      .tick(220);
    const clamp = (v: number | undefined, lo: number, hi: number) => Math.max(lo, Math.min(hi, v ?? lo));
    nodes.forEach((n) => { n.x = clamp(n.x, 70, W - 70); n.y = clamp(n.y, 14, H - 14); });
    return { nodes, links, byId: new Map(nodes.map((n) => [n.id, n])) };
  }, [map, show, year]);
  const label = (id: string) => g.byId.get(id)?.label ?? id;
  const pos = (id: string) => g.byId.get(id) as Sim;
  return (
    <section aria-labelledby="ld-net">
      <h2 id="ld-net">Supply-chain network</h2>
      <div className="ld-ctl">
        <label htmlFor="ld-show">Show</label>
        <select id="ld-show" value={show} onChange={(e) => setShow(e.target.value as "countries" | "products")}>
          <option value="countries">Suppliers and countries</option>
          <option value="products">Suppliers and top products</option>
        </select>
      </div>
      <p className="ld-cap">
        Showing {g.nodes.length} of {map.nodes.length} nodes. Lines from UNICEF are spend for {year}. Other lines count extracted claims. Select a line for its figure and sources.
        {show === "products" ? " Products are limited to the 20 with most extracted claims." : " Products are hidden."}
      </p>
      <p className="ld-legend">
        <span><i className="ld-sw ld-dot" style={{ background: NODE_COLOUR.buyer }} />UNICEF</span>
        <span><i className="ld-sw ld-dot" style={{ background: NODE_COLOUR.supplier }} />supplier</span>
        <span><i className="ld-sw" style={{ background: NODE_COLOUR.country }} />country</span>
        {show === "products" && <span><i className="ld-sw ld-diamond" style={{ background: NODE_COLOUR.product }} />product</span>}
      </p>
      <div className="ld-net-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Supply-chain network" className="ld-net">
        {g.links.map((l, i) => {
          const a = pos(l.edge.from);
          const b = pos(l.edge.to);
          const e = l.edge;
          const item = () => onOpen({ title: `${label(e.from)} to ${label(e.to)}`, figure: e.figure, evidence: (e.claims ?? []).filter(priceFree) });
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`${label(e.from)} to ${label(e.to)}: ${e.figure.value ?? "no figure"} ${e.figure.unit ?? ""}, tier ${e.figure.tier}`}
              onClick={item}
              onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); item(); } }}
            >
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="ld-edge" strokeDasharray={e.kind === "spend" && e.figure.value == null ? "3 3" : undefined} />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="ld-hit" />
            </g>
          );
        })}
        {g.nodes.map((n) => (
          <g key={n.id}>
            {n.kind === "country" ? (
              <rect x={(n.x ?? 0) - 4} y={(n.y ?? 0) - 4} width={8} height={8} fill={NODE_COLOUR.country} />
            ) : n.kind === "product" ? (
              <rect x={(n.x ?? 0) - 4} y={(n.y ?? 0) - 4} width={8} height={8} fill={NODE_COLOUR.product} transform={`rotate(45 ${n.x} ${n.y})`} />
            ) : (
              <circle cx={n.x} cy={n.y} r={n.kind === "buyer" ? 8 : 6} fill={NODE_COLOUR[n.kind] ?? "#5b6671"} />
            )}
            <text className={`ld-n-${n.kind}`} x={(n.x ?? 0) + 10} y={(n.y ?? 0) + 4}>{n.label.length > 24 ? n.label.slice(0, 23) + "…" : n.label}</text>
          </g>
        ))}
      </svg>
      </div>
      <p className="ld-cap"><Link to="/map">Supply chain map</Link></p>
    </section>
  );
}

export default function Suppliers({ buyer, onOpen }: { buyer: Buyer; onOpen: (i: PanelItem) => void }): JSX.Element {
  const suppliers = useBuyerJson<Suppliers>("suppliers");
  const spend = useBuyerJson<Spend>("spend");
  const climate = useBuyerJson<Climate>("climate");
  const org = useBuyerJson<OrgHypergraph>("org_hypergraph");
  const map = useBuyerJson<MapData>("map");
  const [view, setView] = useState("2024");
  const error = suppliers.error ?? spend.error ?? climate.error ?? org.error ?? map.error;
  const ready = suppliers.data && spend.data && climate.data && org.data && map.data;
  return (
    <>
      <main className="page ld">
        <PageHead
          title="Who carries UNICEF vaccine spend, and what do they say about their climate performance?"
          lede="Every figure links to the file, document and page it came from. Claims are extracted statements and not all have been checked. No count here is a finding, and no supplier is rated."
          rules={buyer.disclaimers}
        />
        {error && <p className="empty" role="alert">{error}</p>}
        {!error && !ready && <p className="empty">Loading buyer data.</p>}
        {ready && (
          <>
            <Coverage suppliers={suppliers.data!} spend={spend.data!} org={org.data!} />
            <Grid climate={climate.data!} onOpen={onOpen} />
            <SpendBars spend={spend.data!} view={view} onView={setView} onOpen={onOpen} />
            <Network map={map.data!} year={view === CA ? "2024" : view} onOpen={onOpen} />
          </>
        )}
      </main>
    </>
  );
}
