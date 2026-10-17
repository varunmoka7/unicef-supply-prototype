import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBuyerJson, type Buyer, type Figure } from "../lib/buyer";
import { buildTree, claimCount, type GroupIn, type ItemIn, type MapData, type SupplierIn } from "../lib/mapCategories";
import { layoutRadial, layoutTree, layoutTreeDown, textWidth, type PLink, type PNode, type Pos } from "../lib/mapLayout";
import "./SupplyChainMap.css";
import type { PanelItem } from "../components/SourcePanel";

const YEARS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025"];
const CLAIM_NOTE = "model-extracted, not source-checked";

type View = "tree" | "radial";

const tierName = (t: string) => t.replace(/_/g, " ");

// text with a paper halo; a spend label ("USD 482.9 M · reported") draws its tier as a boxed code
function Label({ p, cls, spend }: { p: Pos; cls: string; spend?: boolean }) {
  const [amount, tier] = spend ? p.text.split(" · ") : [p.text, undefined];
  const common = { dy: p.dy, fontSize: p.size, fontWeight: p.bold ? 700 : 400 };
  const tw = tier ? textWidth(tier, p.size, true) * 1.2 + 10 : 0;
  const ax = tier ? (p.anchor === "end" ? -tw - 6 : 0) : 0;
  const bx = p.anchor === "end" ? -tw : textWidth(amount, p.size) + 6;
  return (
    <g transform={`translate(${p.x},${p.y}) rotate(${p.deg})`}>
      <text x={ax} textAnchor={p.anchor} className={`lbl ${cls}`} {...common}>
        {p.text !== p.full && <title>{p.full}</title>}
        {amount}
      </text>
      {tier && (
        <g className={`m-tier ${tier}`}>
          <rect x={bx} y={p.dy - 11} width={tw} height={15} />
          <text x={bx + tw / 2} y={p.dy} dy={0} textAnchor="middle" fontSize={p.size} fontWeight={700}>
            {tierName(tier)}
          </text>
        </g>
      )}
    </g>
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

  const linkClass = (l: PLink) => {
    if (l.kind !== "spend") return `m-link claim ${l.kind}`;
    return `m-link spend ${find.get(l.to)?.s.spend?.figure.tier ?? "gap"}`;
  };
  const linkWidth = (l: PLink) => (l.kind === "item" ? 1 : l.kind === "category" ? 1.25 : 1.5);
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
        <svg viewBox={`${x} ${y} ${w} ${h}`} role="group" aria-label="Supply chain map" className={`map-svg${view === "tree" && down ? " fixed" : ""}`} style={{ "--w": `${w}px` } as React.CSSProperties}>
          <defs>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" className="hatch-bg" />
              <line x1="0" y1="0" x2="0" y2="6" className="hatch-ln" />
            </pattern>
          </defs>

          {layout.links.map((l) => {
            return (
              <g key={`${l.from}>${l.to}`} className="edge" aria-label={linkName(l)} {...press(l.to)}>
                <path d={l.d} fill="none" stroke="transparent" strokeWidth={10} />
                <path d={l.d} fill="none" className={linkClass(l)} stroke="currentColor" strokeWidth={linkWidth(l)} />
              </g>
            );
          })}

          {layout.nodes.map((n) => {
            const hit = find.get(n.id);
            const isHold = n.kind === "supplier" && hold.has(n.id);
            const gap = n.kind === "supplier" && hit?.s.gap;
                        return (
              <g key={n.id} className={n.kind === "buyer" ? undefined : "node"} aria-label={nodeName(n)} {...(n.kind === "buyer" ? {} : press(n.id))}>
                {n.kind === "category" ? (
                  <rect className="m-cat" x={n.x - n.r} y={n.y - n.r} width={n.r * 2} height={n.r * 2} />
                ) : (
                  <circle className={`m-dot ${n.kind}${isHold ? " hold" : ""}${gap ? " gap" : ""}`} cx={n.x} cy={n.y} r={n.r} />
                )}
                <Label p={n.label} cls={n.label.fill ? "buyer" : "node-lbl"} />
              </g>
            );
          })}

          {layout.links.map((l) => (
            <g key={`lbl-${l.from}>${l.to}`} aria-hidden="true" onClick={() => activate(l.to)} className="edge">
              <Label p={l.label} cls="edge-lbl" spend={l.kind === "spend"} />
            </g>
          ))}
        </svg>
      </div>

      <aside className="map-legend" aria-label="Legend">
        <p>
          Line style carries the tier, as in the boxed codes below: solid is stated by a source, dashed is derived or averaged, dotted is
          model-extracted. A dashed spend line means no published figure in Annex 2 for {year}, not zero. A red ring marks a supplier whose
          reporting boundary is not resolved. Line width carries no value. Claim counts are {CLAIM_NOTE}. Click a category to list its
          items; click anything to see its source. Country names appear as the source wrote them, so one country can appear twice under
          Countries.
        </p>
        <ul>
          {Object.entries(buyer.tiers).map(([k, meaning]) => (
            <li key={k}>
              <span className={`tier ${k}`}>{tierName(k)}</span> {meaning}
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
