import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useBuyerJson } from "../lib/buyer";
import type { PanelItem } from "../components/SourcePanel";
import { NATURES, type ClimateData, type Nature } from "./ClimateHypergraph";
import "./EsgSegments.css";

type Mode = "concept" | "supplier" | "nature";
const MODES: { id: Mode; label: string }[] = [
  { id: "concept", label: "Concept" },
  { id: "supplier", label: "Supplier" },
  { id: "nature", label: "Claim nature" },
];
const NATURE_NAME = (n: string) => (n === "actual" ? "measured" : n);
const NATURE_COLOUR = (n: Nature) => `var(--n-${n === "actual" ? "actual" : n})`;
const MIXED = "#6b7780";
const W = 1100;
const H = 700;

type Cell = ClimateData["cells"][number];
type Dot = d3.SimulationNodeDatum & { id: string; hub: string; cell: Cell; n: number; colour: string; r: number; nature?: Nature };
type Hub = d3.SimulationNodeDatum & { id: string; label: string; colour: string; isHub: true };

// Hub label offsets from the hub centre: above by default, else the next free row
// below, above, below... of labels already placed (left to right). 11px bold ≈ 6.5px/char.
const LABEL_H = 14;
const slot = (i: number) => (i % 2 ? 24 + (LABEL_H * (i - 1)) / 2 : -14 - (LABEL_H * i) / 2);
export function placeLabels(hubs: Hub[]): Map<string, number> {
  const placed: { x0: number; x1: number; y: number }[] = [];
  const out = new Map<string, number>();
  for (const h of [...hubs].sort((a, b) => a.x! - b.x!)) {
    const half = (h.label.length * 6.5) / 2;
    const box = (dy: number) => ({ x0: h.x! - half, x1: h.x! + half, y: h.y! + dy });
    const clash = (b: { x0: number; x1: number; y: number }) =>
      placed.some((p) => b.x0 < p.x1 && p.x0 < b.x1 && Math.abs(b.y - p.y) < LABEL_H);
    let i = 0;
    while (clash(box(slot(i)))) i++;
    const dy = slot(i);
    placed.push(box(dy));
    out.set(h.id, dy);
  }
  return out;
}

export default function EsgSegments({ onOpen }: { onOpen: (i: PanelItem) => void }): JSX.Element {
  const { data, error } = useBuyerJson<ClimateData>("climate");
  if (error) return <p className="empty" role="alert">{error}</p>;
  if (!data) return <p className="empty">Loading climate data.</p>;
  return <Segments data={data} onOpen={onOpen} />;
}

function Segments({ data, onOpen }: { data: ClimateData; onOpen: (i: PanelItem) => void }) {
  const [mode, setMode] = useState<Mode>("concept");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<SVGGElement>(null);
  const [, setFrame] = useState(0);
  const lastPos = useRef(new Map<string, { x: number; y: number }>());

  const sName = useMemo(() => new Map(data.suppliers.map((s) => [s.id, s.name])), [data]);
  const cLabel = useMemo(() => new Map(data.concepts.map((c) => [c.id, c])), [data]);

  const cells = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.cells.filter(
      (c) =>
        (!needle || (sName.get(c.supplier) ?? "").toLowerCase().includes(needle)) &&
        (group === "all" || cLabel.get(c.concept)?.group === group) &&
        (supplier === "all" || c.supplier === supplier),
    );
  }, [data, q, group, supplier, sName, cLabel]);

  const layout = useMemo(() => {
    const dots: Dot[] = [];
    // A cell's dot takes a nature hue only when all its claims share one nature; mixed cells stay grey.
    const cellColour = (c: Cell) => {
      const present = NATURES.filter((nat) => c.natures[nat] > 0);
      return present.length === 1 ? NATURE_COLOUR(present[0]) : MIXED;
    };
    const hubLabel = new Map<string, { label: string; colour: string }>();
    for (const c of cells) {
      const concept = cLabel.get(c.concept);
      if (mode === "concept") {
        hubLabel.set(c.concept, { label: concept?.label ?? c.concept, colour: "#101820" });
        dots.push({ id: `${c.supplier}|${c.concept}`, hub: c.concept, cell: c, n: c.claims, colour: cellColour(c), r: 0 });
      } else if (mode === "supplier") {
        hubLabel.set(c.supplier, { label: sName.get(c.supplier) ?? c.supplier, colour: "#101820" });
        dots.push({ id: `${c.supplier}|${c.concept}`, hub: c.supplier, cell: c, n: c.claims, colour: cellColour(c), r: 0 });
      } else {
        for (const nat of NATURES) {
          const n = c.natures[nat];
          if (n <= 0) continue;
          hubLabel.set(nat, { label: NATURE_NAME(nat), colour: "#101820" });
          dots.push({ id: `${c.supplier}|${c.concept}|${nat}`, hub: nat, cell: c, n, colour: NATURE_COLOUR(nat as Nature), r: 0, nature: nat });
        }
      }
    }
    const maxN = d3.max(dots, (d) => d.n) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxN]).range([3, 11]);
    for (const d of dots) d.r = rScale(d.n);
    const hubs: Hub[] = [...hubLabel].map(([id, v], i, all) => {
      const a = (2 * Math.PI * i) / all.length;
      return { id: `hub:${id}`, label: v.label, colour: v.colour, isHub: true, x: W / 2 + Math.cos(a) * W * 0.4, y: H / 2 + Math.sin(a) * H * 0.42 };
    });
    const byHub = new Map(hubs.map((h) => [h.id.slice(4), h]));
    dots.forEach((d, i) => {
      const h = byHub.get(d.hub)!;
      d.x = h.x! + Math.cos(i) * 30;
      d.y = h.y! + Math.sin(i) * 30;
    });
    // Nodes that survive a filter or mode change start where they were, so they glide.
    for (const n of [...hubs, ...dots]) {
      const p = lastPos.current.get(n.id);
      if (p) { n.x = p.x; n.y = p.y; }
    }
    const links = dots.map((d) => ({ source: `hub:${d.hub}`, target: d.id }));
    const nodes: (Dot | Hub)[] = [...hubs, ...dots];
    // Keep every node inside W x H; a hub also keeps its label (half-width, plus a row above and below) in frame.
    const bound = () => {
      for (const n of nodes) {
        const hub = n as Hub;
        const px = hub.isHub ? hub.label.length * 4.4 + 12 : (n as Dot).r + 4;
        const py = hub.isHub ? 50 : (n as Dot).r + 4;
        n.x = Math.min(Math.max(n.x!, px), W - px);
        n.y = Math.min(Math.max(n.y!, py), H - py);
      }
    };
    const sim = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("charge", d3.forceManyBody().strength((d) => ((d as Hub).isHub ? -500 : -6)))
      .force("link", d3.forceLink(links).id((d) => (d as Dot | Hub).id).distance(46).strength(0.8))
      .force("collide", d3.forceCollide<Dot | Hub>((d) => ((d as Hub).isHub ? 40 : (d as Dot).r + 1.5)))
      .force("x", d3.forceX(W / 2).strength(0.02))
      .force("y", d3.forceY(H / 2).strength(0.035))
      .force("bound", bound)
      .alphaDecay(0.012)
      .velocityDecay(0.5)
      .stop();
    return { dots, hubs, sim };
  }, [cells, mode, cLabel, sName]);

  // Zoom, pan and drag as in apps/hypergraph TierCountryMap: d3.zoom on the svg,
  // dragging a dot or hub reheats the simulation (a hub carries its ring) and
  // releasing lets it settle. A new layout (any filter change) resets the view.
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const g = d3.select(zoomRef.current!);
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
    const { sim } = layout;
    sim.on("tick", () => {
      for (const n of [...layout.hubs, ...layout.dots]) lastPos.current.set(n.id, { x: n.x!, y: n.y! });
      setFrame((f) => f + 1);
    });
    sim.alpha(1).restart();
    const byId = new Map<string, Dot | Hub>([...layout.hubs, ...layout.dots].map((n) => [n.id, n]));
    const drag = d3
      .drag<SVGElement, Dot | Hub>()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    svg
      .selectAll<SVGElement, Dot | Hub>("[data-id]")
      .datum(function () { return byId.get(this.getAttribute("data-id")!)!; })
      .call(drag);
    return () => {
      sim.stop().on("tick", null);
      svg.on(".zoom", null);
    };
  }, [layout]);

  const citedTotal = cells.reduce((s, c) => s + c.items.length, 0);
  const hubOf = new Map(layout.hubs.map((h) => [h.id.slice(4), h]));
  const labelDy = placeLabels(layout.hubs);

  const open = (d: Dot) => {
    const c = d.cell;
    const items = d.nature ? c.items.filter((i) => i.nature === d.nature) : c.items;
    const natureLabel = d.nature && NATURE_NAME(d.nature);
    onOpen({
      title: `${sName.get(c.supplier)}: ${cLabel.get(c.concept)?.label}${natureLabel ? ` (${natureLabel})` : ""}`,
      evidence: items,
      note: d.n === 0
        ? `${c.contexts} contexts, no claims: a gap, not zero.`
        : d.n > items.length
          ? `Showing ${items.length} of ${d.n} claims; the rest are not in the extract.`
          : undefined,
    });
  };

  return (
    <main className="page seg-page" ref={root}>
      <div className="field-row seg-stats">
        <div className="field"><span className="f-value">{new Set(cells.map((c) => c.supplier)).size}</span>{" "}<span className="f-name">suppliers</span></div>
        <div className="field"><span className="f-value">{new Set(cells.map((c) => c.concept)).size}</span>{" "}<span className="f-name">concepts</span></div>
        <div className="field"><span className="f-value">{citedTotal}</span>{" "}<span className="f-name">cited claim appearances</span></div>
      </div>
      <p className="seg-note">Claims can appear under several concepts. Their source context has the concept tag; the claim may not mention it.</p>
      <div className="seg-bar">
        <span className="seg-group" role="group" aria-label="Group by">
          <span className="seg-bar-label">Group by</span>
          <span className="tabs">
            {MODES.map((m) => (
              <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
            ))}
          </span>
        </span>
        <input type="search" placeholder="Search supplier" aria-label="Search supplier" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Concept group" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">All concept groups</option>
          <option value="framework">Frameworks</option>
          <option value="metric">Metrics</option>
          <option value="scope">Scopes</option>
        </select>
        <select aria-label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
          <option value="all">All suppliers</option>
          {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" className="chip" onClick={() => root.current?.requestFullscreen?.()}>Full screen</button>
      </div>
      <ul className="seg-key" aria-label="Key">
        {NATURES.map((n) => (
          <li key={n}><i style={{ background: NATURE_COLOUR(n) }} />{NATURE_NAME(n)}</li>
        ))}
        <li><i style={{ background: MIXED }} />mixed natures</li>
        <li><i className="seg-key-gap" />no claims (a gap, not zero)</li>
        <li className="seg-key-size">Dot size follows claim count. Diamond is the group.</li>
      </ul>
      <div className="seg-canvas">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ESG claims by segment" onMouseLeave={() => setTip(null)}>
        <g ref={zoomRef}>
        <g>
          {layout.dots.map((d) => {
            const h = hubOf.get(d.hub)!;
            return <line key={d.id} x1={h.x} y1={h.y} x2={d.x} y2={d.y} stroke="#c5cdd2" strokeWidth={1} />;
          })}
        </g>
        <g>
          {layout.dots.map((d) => (
            <circle
              key={d.id}
              data-id={d.id}
              role="button"
              tabIndex={0}
              aria-label={`${sName.get(d.cell.supplier)}, ${cLabel.get(d.cell.concept)?.label}: ${d.n} claims`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={d.n === 0 ? "#f5efe2" : d.colour}
              stroke={d.n === 0 ? "#101820" : "#f5efe2"}
              strokeWidth={d.n === 0 ? 1.5 : 1}
              strokeDasharray={d.n === 0 ? "2 2" : undefined}
              onClick={() => open(d)}
              onKeyDown={(e) => e.key === "Enter" && open(d)}
              onMouseMove={(e) => {
                const b = root.current!.getBoundingClientRect();
                const nat = d.nature ? ` · ${NATURE_NAME(d.nature)}` : "";
                setTip({ x: e.clientX - b.left + 12, y: e.clientY - b.top + 12, text: `${sName.get(d.cell.supplier)} · ${cLabel.get(d.cell.concept)?.label}${nat} · ${d.n} claims` });
              }}
            />
          ))}
        </g>
        <g>
          {layout.hubs.map((h) => (
            <g key={h.id} data-id={h.id} className="seg-hub" transform={`translate(${h.x},${h.y})`}>
              <path d={d3.symbol(d3.symbolDiamond, 140)()!} fill="#101820" />
              <text y={labelDy.get(h.id)} textAnchor="middle" className="seg-hub-label">{h.label}</text>
            </g>
          ))}
        </g>
        </g>
      </svg>
      </div>
      {tip && <div className="seg-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
      {cells.length === 0 && <p className="empty">No cells match these filters.</p>}
    </main>
  );
}
