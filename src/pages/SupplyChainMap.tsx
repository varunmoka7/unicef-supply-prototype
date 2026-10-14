import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBuyerJson, type Buyer, type Figure } from "../lib/buyer";
import { buildTree, claimCount, type GroupIn, type ItemIn, type MapData, type SupplierIn } from "../lib/mapCategories";
import { layoutRadial, layoutTree, layoutTreeDown, type PLink, type PNode, type Pos } from "../lib/mapLayout";
import type { PanelItem } from "../components/SourcePanel";

const YEARS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025"];
const CLAIM_NOTE = "model-extracted, not source-checked";

// buyer.json carries the tier meanings; the colour per tier lives here.
const TIER_COLOUR: Record<string, string> = {
  reported: "#0b5cad",
  contract_award: "#6b4fa0",
  bcg_reported: "#1b7f4b",
  inferred: "#b7791f",
  category_average: "#7a8691",
  gap: "#a8321f",
  claim_extracted: "#c26a00",
};
const colour = (tier: string) => TIER_COLOUR[tier] ?? "#7a8691";

type View = "tree" | "radial";

function Label({ p, fill = "#17202a" }: { p: Pos; fill?: string }) {
  return (
    <text
      transform={`translate(${p.x},${p.y}) rotate(${p.deg})`}
      textAnchor={p.anchor}
      dy={p.dy}
      fontSize={p.size}
      fontWeight={p.bold ? 700 : 400}
      fill={p.fill ?? fill}
      className={p.fill ? undefined : "halo"}
    >
      {p.text !== p.full && <title>{p.full}</title>}
      {p.text}
    </text>
  );
}

function Map({ data, buyer, onOpen }: { data: MapData; buyer: Buyer; onOpen: (i: PanelItem) => void }) {
  const [year, setYear] = useState("2024");
  const [view, setView] = useState<View>("tree");
  const [only, setOnly] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const down = params.get("orient") === "down";
  const setDown = (d: boolean) =>
    setParams((p) => {
      if (d) p.set("orient", "down");
      else p.delete("orient");
      return p;
    });

  const hold = useMemo(() => new Set(buyer.suppliers.filter((s) => s.boundary_hold).map((s) => s.id)), [buyer]);
  const tree = useMemo(() => buildTree(data, year, only), [data, year, only]);
  const layout = useMemo(() => (view === "radial" ? layoutRadial : down ? layoutTreeDown : layoutTree)(tree, open), [tree, view, open, down]);

  const find = useMemo(() => {
    const m = new globalThis.Map<string, { s: SupplierIn; g?: GroupIn; i?: ItemIn }>();
    for (const s of tree) {
      m.set(s.id, { s });
      for (const g of s.groups) {
        m.set(g.id, { s, g });
        for (const i of g.items) m.set(i.id, { s, g, i });
      }
    }
    return m;
  }, [tree]);

  const openSupplier = (s: SupplierIn) => {
    if (!s.spend) return;
    const f = s.spend.figure;
    const flag = hold.has(s.id) ? [f.flag, "Reporting boundary not resolved for this supplier."].filter(Boolean).join(" ") : f.flag;
    onOpen({ title: `${s.label}, UNICEF spend ${year}`, figure: { ...f, flag } });
  };
  const openGroup = (s: SupplierIn, g: GroupIn) => {
    setOpen(open === g.id ? null : g.id);
    const edges = g.items.map((i) => i.edge);
    const figure: Figure = {
      value: claimCount(edges),
      unit: "claims",
      tier: "claim_extracted",
      source: edges[0].figure.source,
      added_by: edges[0].figure.added_by,
      note: CLAIM_NOTE,
    };
    onOpen({ title: `${s.label}: ${g.label}`, figure, evidence: edges.flatMap((e) => e.claims ?? []) });
  };
  const openItem = (s: SupplierIn, i: ItemIn) => onOpen({ title: `${i.label}, from ${s.label}`, figure: i.edge.figure, evidence: i.edge.claims });

  const activate = (id: string) => {
    const hit = find.get(id);
    if (!hit) return;
    if (hit.i) openItem(hit.s, hit.i);
    else if (hit.g) openGroup(hit.s, hit.g);
    else openSupplier(hit.s);
  };
  const press = (id: string) => ({
    role: "button",
    tabIndex: 0,
    onClick: () => activate(id),
    onKeyDown: (k: React.KeyboardEvent) => (k.key === "Enter" || k.key === " ") && (k.preventDefault(), activate(id)),
  });

  const linkStyle = (l: PLink) => {
    if (l.kind !== "spend") return { stroke: colour("claim_extracted"), width: l.kind === "category" ? 1.25 : 1, dash: undefined };
    const tier = find.get(l.to)?.s.spend?.figure.tier ?? "gap";
    return { stroke: colour(tier), width: 1.5, dash: tier === "gap" ? "5 4" : undefined };
  };
  const linkName = (l: PLink) => {
    const hit = find.get(l.to);
    if (!hit) return l.to;
    if (hit.i) return `${hit.g!.label.split(" · ")[0]} to ${hit.i.label}, ${hit.i.countText}`;
    if (hit.g) return `${hit.s.label} to ${hit.g.label}, ${hit.g.countText}`;
    return `UNICEF to ${hit.s.label}, spend ${year}: ${hit.s.spendText}`;
  };
  const nodeName = (n: PNode) => {
    const hit = find.get(n.id);
    if (!hit) return n.label.full;
    if (hit.i) return `${hit.i.label}, ${hit.i.countText}`;
    if (hit.g) return `${hit.s.label}: ${hit.g.label}, ${open === n.id ? "open" : "closed"}`;
    return `${hit.s.label}${hold.has(n.id) ? ", boundary hold" : ""}, spend ${year}: ${hit.s.spendText}`;
  };

  const { x, y, w, h } = layout.view;
  return (
    <main className="map-page">
      <div className="map-controls">
        <div className="chips" role="group" aria-label="Year">
          {YEARS.map((yr) => (
            <button key={yr} type="button" className="chip" aria-pressed={year === yr} onClick={() => setYear(yr)}>
              {yr}
            </button>
          ))}
        </div>
        <div className="tabs" role="group" aria-label="View">
          {(["tree", "radial"] as View[]).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "tree" ? "Tree" : "Radial"}
            </button>
          ))}
        </div>
        {view === "tree" && (
          <div className="tabs" role="group" aria-label="Orientation">
            <button type="button" aria-pressed={!down} onClick={() => setDown(false)}>
              Left to right
            </button>
            <button type="button" aria-pressed={down} onClick={() => setDown(true)}>
              Top down
            </button>
          </div>
        )}
        <select aria-label="Supplier" value={only} onChange={(e) => setOnly(e.target.value)}>
          <option value="all">All suppliers</option>
          {data.nodes.filter((n) => n.kind === "supplier").map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="map-scroll">
        <svg viewBox={`${x} ${y} ${w} ${h}`} role="group" aria-label="Supply chain map" className="map-svg" style={view === "tree" && down ? { width: w } : { maxWidth: w }}>
          <defs>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#fff" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#a8321f" strokeWidth="2" />
            </pattern>
          </defs>

          {layout.links.map((l) => {
            const st = linkStyle(l);
            return (
              <g key={`${l.from}>${l.to}`} className="edge" aria-label={linkName(l)} {...press(l.to)}>
                <path d={l.d} fill="none" stroke="transparent" strokeWidth={10} />
                <path d={l.d} fill="none" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} />
              </g>
            );
          })}

          {layout.nodes.map((n) => {
            const hit = find.get(n.id);
            const isHold = n.kind === "supplier" && hold.has(n.id);
            const gap = n.kind === "supplier" && hit?.s.gap;
            const countries = n.kind === "category" && hit?.g?.label.startsWith("Countries");
            return (
              <g key={n.id} className={n.kind === "buyer" ? undefined : "node"} aria-label={nodeName(n)} {...(n.kind === "buyer" ? {} : press(n.id))}>
                {n.kind === "category" ? (
                  <rect x={n.x - n.r} y={n.y - n.r} width={n.r * 2} height={n.r * 2} rx={2} fill={countries ? "#e9f5ee" : "#fff4e5"} stroke="#17202a" strokeWidth={2} />
                ) : (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={n.kind === "buyer" ? "#0b5cad" : n.kind === "item" ? "#fff" : gap ? "url(#hatch)" : "#e8f1fb"}
                    stroke={isHold ? "#a8321f" : "#17202a"}
                    strokeWidth={isHold ? 3 : 2}
                  />
                )}
                <Label p={n.label} />
              </g>
            );
          })}

          {layout.links.map((l) => (
            <g key={`lbl-${l.from}>${l.to}`} aria-hidden="true" onClick={() => activate(l.to)} className="edge">
              <Label p={l.label} fill={l.kind === "spend" ? linkStyle(l).stroke : "#5b6671"} />
            </g>
          ))}
        </svg>
      </div>

      <aside className="map-legend" aria-label="Legend">
        <p>
          Line colour is the tier. A dashed line means no published figure in Annex 2 for {year}, not zero. Line width carries no
          value. Claim counts are {CLAIM_NOTE}. Click a category to list its items; click anything to see its source. Country names
          appear as the source wrote them, so one country can appear twice under Countries.
        </p>
        <ul>
          {Object.entries(buyer.tiers).map(([k, meaning]) => (
            <li key={k}>
              <span className="swatch" style={{ background: colour(k) }} />
              <strong>{k}</strong>: {meaning}
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}

export default function SupplyChainMap({ buyer, onOpen }: { buyer: Buyer; onOpen: (i: PanelItem) => void }) {
  const map = useBuyerJson<MapData>("map");
  if (map.error) return <p className="empty" role="alert">{map.error}</p>;
  if (!map.data) return <p className="empty">Loading map.</p>;
  const bad = map.data.edges.find((e) => !e.figure?.tier);
  if (bad) return <p className="empty" role="alert">An edge in map.json has no tier ({bad.from} to {bad.to}); the page will not draw it.</p>;
  return <Map data={map.data} buyer={buyer} onOpen={onOpen} />;
}
