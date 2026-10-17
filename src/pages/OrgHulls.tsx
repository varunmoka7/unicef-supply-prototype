import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Evidence } from "../lib/buyer";

// Hull view of org_hypergraph.json (UNICEF Supply KB only), after the Tata
// "Hypergraph Claims" view in apps/hypergraph CompanyIntelligence.tsx.
// Two groups that are never drawn together: ESG claims, and every other claim (supply operations).

type Group = "esg" | "operations";
type NodeType = "company" | "topic" | "framework" | "evidence";
type Claims = { claims: number; items: Evidence[] };
type GNode = { id: string; type: NodeType; label: string; group: Group | null; claims?: number; items?: Evidence[] };
type SimNode = d3.SimulationNodeDatum & GNode;
type Edge = Claims & { id: string; group: Group; category: string; title: string; members: string[] };
type Row = Claims & { label: string; key: string | null };
type Totals = { claims: number; contexts: number; documents: number; natures: Record<string, number> };
export type OrgHypergraph = {
  nodes: GNode[];
  edges: Edge[];
  breakdowns: { group: Group; id: string; title: string; note?: string; rows: Row[] }[];
  stats: { kb_claims: number; esg: Totals; operations: Totals };
};
export type OrgSelection = { title: string; claims: Evidence[]; note: string };

const W = 980;
const H = 760;
const GROUPS: { id: Group; label: string }[] = [
  { id: "esg", label: "ESG claims" },
  { id: "operations", label: "Supply operations" },
];
const NODE_COLOUR: Record<NodeType, string> = { company: "#1a1a2e", topic: "#1565C0", framework: "#E65100", evidence: "#78909C" };
const CATEGORY_COLOUR: Record<string, string> = {
  // ESG pillars: kept off the --n-* nature hues; dash pattern and text name carry the pillar too
  environmental: "#00796b",
  social: "#ad1457",
  governance: "#4a5560",
  // supply operations categories
  procurement_spend: "#5c6bc0",
  shipment: "#00838f",
  market: "#b5791a",
  tender: "#6a4fb3",
  policy_requirement: "#ad1457",
  product_quality: "#c62828",
  climate: "#00695c",
  other: "#78909c",
};
const DASH: Record<string, string> = { social: "7 4", governance: "2 3" };
const colourOf = (c: string | null) => (c && CATEGORY_COLOUR[c]) || "#607d8b";
const nice = (c: string) => c.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** One sentence saying what a single hyperedge joins. */
function describe(e: Edge, byId: Map<string, GNode>): string {
  const of = (t: NodeType) => e.members.map((m) => byId.get(m)).filter((n): n is GNode => n?.type === t).map((n) => n.label);
  const topic = (of("topic")[0] ?? "").toLowerCase();
  const fws = of("framework");
  const head =
    e.group === "esg"
      ? `${e.claims.toLocaleString()} ${e.category} claims about ${topic}.`
      : `${e.claims.toLocaleString()} ${nice(e.category).toLowerCase()} claims that mention ${topic}.`;
  return `${head}${fws.length ? ` They name ${list(fws)}.` : ""} Top source${of("evidence").length > 1 ? "s" : ""}: ${list(of("evidence"))}.`;
}

export default function OrgHulls({ data, onSelect }: { data: OrgHypergraph; onSelect: (s: OrgSelection) => void }) {
  const [group, setGroup] = useState<Group>("esg");
  const [category, setCategory] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Edge | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data]);
  const categories = useMemo(() => [...new Set(data.edges.filter((e) => e.group === group).map((e) => e.category))], [data, group]);
  const shown = useMemo(() => data.edges.filter((e) => e.group === group && (!category || e.category === category)), [data, group, category]);

  const open = (title: string, c: Claims) =>
    onSelect({
      title,
      claims: c.items,
      note: `${c.claims.toLocaleString()} claims; showing the ${c.items.length} with the highest extraction confidence. Prototype figures, not adjudicated.`,
    });
  // d3 handlers are bound once per layout; read the latest open() through a ref
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .extent([[0, 0], [W, H]])
      .on("zoom", (e) => g.attr("transform", e.transform));
    // a new layout starts unzoomed; svg keeps its old __zoom across rebuilds unless reset
    svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

    const used = new Set(shown.flatMap((e) => e.members));
    const simNodes: SimNode[] = data.nodes.filter((n) => used.has(n.id)).map((n) => ({ ...n }));
    simNodes.forEach((n, i) => {
      // d3 starts nodes near (0,0); seed a ring round the centre so the layout settles in place
      n.x = W / 2 + 220 * Math.cos((2 * Math.PI * i) / simNodes.length);
      n.y = H / 2 + 220 * Math.sin((2 * Math.PI * i) / simNodes.length);
    });
    const idx = new Map(simNodes.map((n, i) => [n.id, i]));
    const org = simNodes.find((n) => n.type === "company");
    if (org) {
      org.fx = W / 2;
      org.fy = H / 2;
    }
    const links: { source: number; target: number }[] = [];
    shown.forEach((e) => {
      for (let i = 0; i < e.members.length; i++)
        for (let j = i + 1; j < e.members.length; j++) links.push({ source: idx.get(e.members[i])!, target: idx.get(e.members[j])! });
    });
    const sim = d3
      .forceSimulation(simNodes)
      .force("charge", d3.forceManyBody().strength(-700))
      .force("collision", d3.forceCollide(60))
      .force("x", d3.forceX(W / 2).strength(0.03))
      .force("y", d3.forceY(H / 2).strength(0.03))
      .force("link", d3.forceLink(links).distance(190).strength(0.2));

    const hullPoints = (ids: string[], pad: number) => {
      const pts: [number, number][] = [];
      ids.forEach((id) => {
        const n = simNodes[idx.get(id)!];
        if (n.x == null || n.y == null) return;
        for (let a = 0; a < 2 * Math.PI; a += Math.PI / 4) pts.push([n.x + Math.cos(a) * pad, n.y + Math.sin(a) * pad]);
      });
      return pts.length >= 6 ? d3.polygonHull(pts) : null;
    };

    const hulls = g
      .append("g")
      .selectAll("path")
      .data(shown)
      .enter()
      .append("path")
      .attr("role", "button")
      .attr("tabindex", 0)
      .attr("aria-label", (d) => `${d.title}, ${d.claims} claims`)
      .attr("fill", (d) => colourOf(d.category))
      .attr("fill-opacity", 0.12)
      .attr("stroke", (d) => colourOf(d.category))
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", (d) => DASH[d.category] ?? null)
      .attr("stroke-opacity", 0.8)
      .style("cursor", "pointer");
    if (window.innerWidth <= 760) svg.style("touch-action", "pan-x pan-y pinch-zoom"); // let the scroll wrapper pan on touch

    const openNode = (d: SimNode) =>
      d.items && openRef.current(`${nice(d.type === "evidence" ? "source" : d.type)}: ${d.label}`, { claims: d.claims ?? d.items.length, items: d.items });
    const nodeG = g
      .append("g")
      .selectAll("g")
      .data(simNodes)
      .enter()
      .append("g")
      .attr("role", (d) => (d.items ? "button" : null))
      .attr("tabindex", (d) => (d.items ? 0 : null))
      .attr("aria-label", (d) => (d.items ? `${d.label}, open claims` : null))
      .style("cursor", (d) => (d.items ? "pointer" : "grab"))
      .on("click", (e: MouseEvent, d) => {
        if (!e.defaultPrevented) openNode(d); // defaultPrevented: a drag, not a click
      })
      .on("keydown", (e: KeyboardEvent, d) => {
        if (e.key === "Enter" || e.key === " ") openNode(d);
      })
      .call(
        d3
          .drag<SVGGElement, SimNode>()
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
            if (d.type !== "company") {
              d.fx = null;
              d.fy = null;
            }
          }) as never,
      );
    nodeG.each(function (d) {
      const el = d3.select(this);
      const fill = NODE_COLOUR[d.type];
      if (d.type === "company") el.append("rect").attr("x", -15).attr("y", -15).attr("width", 30).attr("height", 30).attr("rx", 4).attr("fill", fill);
      else if (d.type === "topic") el.append("circle").attr("r", 12).attr("fill", fill);
      else if (d.type === "evidence") el.append("polygon").attr("points", "0,-12 10,0 0,12 -10,0").attr("fill", fill);
      else
        el.append("polygon")
          .attr("points", d3.range(6).map((i) => `${12 * Math.cos(Math.PI / 6 + (i * Math.PI) / 3)},${12 * Math.sin(Math.PI / 6 + (i * Math.PI) / 3)}`).join(" "))
          .attr("fill", fill);
      el.selectAll("*").attr("stroke", "#fff").attr("stroke-width", 2);
    });
    const labels = g
      .append("g")
      .selectAll("text")
      .data(simNodes)
      .enter()
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.type === "company" ? -22 : 24))
      .attr("font-size", (d) => (d.type === "company" ? 15 : d.type === "evidence" ? 13 : 14))
      .attr("font-weight", (d) => (d.type === "company" ? 700 : 400))
      .attr("fill", (d) => (d.type === "evidence" ? "#46525c" : "#101820"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 4)
      .attr("paint-order", "stroke")
      .attr("stroke-linejoin", "round")
      .attr("pointer-events", "none");

    const isolate = (d: Edge | null) => {
      setHovered(d);
      hulls
        .attr("fill-opacity", (h) => (!d ? 0.12 : h === d ? 0.35 : 0.04))
        .attr("stroke-opacity", (h) => (!d ? 0.8 : h === d ? 1 : 0.15));
      nodeG.attr("opacity", (n) => (!d || d.members.includes(n.id) ? 1 : 0.2));
      labels.attr("opacity", (n) => (!d || d.members.includes(n.id) ? 1 : 0.15));
    };
    hulls
      .on("mouseover focus", (_e, d) => isolate(d))
      .on("mouseout blur", () => isolate(null))
      .on("click", (_e, d) => openRef.current(d.title, d))
      .on("keydown", (e: KeyboardEvent, d) => {
        if (e.key === "Enter" || e.key === " ") openRef.current(d.title, d);
      });

    sim.on("tick", () => {
      simNodes.forEach((n) => {
        n.x = Math.max(70, Math.min(W - 70, n.x!));
        n.y = Math.max(60, Math.min(H - 50, n.y!));
      });
      hulls.attr("d", (d) => {
        const h = hullPoints(d.members, 28);
        return h ? `M${h.join("L")}Z` : null;
      });
      nodeG.attr("transform", (d) => `translate(${d.x},${d.y})`);
      labels.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });
    // label collision: once the layout has settled, move each label above/below its node until it clears the ones already placed
    sim.on("end", () => {
      const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
      const fs = (d: SimNode) => (d.type === "company" ? 15 : d.type === "evidence" ? 13 : 14);
      const order = [...simNodes].sort((a, b) => (a.type === "company" ? -1 : b.type === "company" ? 1 : 0));
      const dyOf = new Map<string, number>();
      order.forEach((d) => {
        const w = d.label.length * fs(d) * 0.56;
        const base = d.type === "company" ? -22 : 24;
        let pick = base;
        for (const off of [0, -base * 1.9, 16, -16, 32, -32, 48, -48]) {
          const dy = base + off;
          const y = d.y! + dy;
          const box = { x0: d.x! - w / 2, x1: d.x! + w / 2, y0: y - fs(d), y1: y + 4 };
          if (!placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) {
            pick = dy;
            break;
          }
        }
        const y = d.y! + pick;
        placed.push({ x0: d.x! - (d.label.length * fs(d) * 0.56) / 2, x1: d.x! + (d.label.length * fs(d) * 0.56) / 2, y0: y - fs(d), y1: y + 4 });
        dyOf.set(d.id, pick);
      });
      labels.attr("dy", (d) => dyOf.get(d.id) ?? 24);
    });
    return () => {
      sim.stop();
      svg.on(".zoom", null);
      svg.selectAll("*").remove();
    };
  }, [data, shown]);

  const mark = (c: string) => (
    <i aria-hidden className={`hg-mark${DASH[c] === "7 4" ? " dashed" : DASH[c] ? " dotted" : ""}`} style={{ color: colourOf(c) }} />
  );
  const t = data.stats[group];
  const pickGroup = (g: Group) => {
    setGroup(g);
    setCategory(null);
    setHovered(null);
  };

  return (
    <div className="hg">
      <div className="hg-top">
        <p>
          {group === "esg"
            ? "ESG claims from UNICEF Supply Division's own reports, grouped by topic. Click any shape or row to read the claims and the page they come from."
            : "Every other claim in the same reports, grouped by claim category and topic. Click any shape or row to read the claims and the page they come from."}
        </p>
        <div className="tabs" role="group" aria-label="Claim group">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => pickGroup(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row hg-stats">
        <div className="field"><span className="f-name">Claims</span><span className="f-value">{t.claims.toLocaleString()}</span><span className="f-note">of {data.stats.kb_claims.toLocaleString()} in the KB</span></div>
        <div className="field"><span className="f-name">Claim groups</span><span className="f-value">{data.edges.filter((e) => e.group === group).length.toLocaleString()}</span></div>
        <div className="field"><span className="f-name">Documents</span><span className="f-value">{t.documents.toLocaleString()}</span></div>
        <div className="field"><span className="f-name">Contexts</span><span className="f-value">{t.contexts.toLocaleString()}</span></div>
      </div>

      <div className="hg-layout">
        <aside className="hg-side">
          {data.breakdowns
            .filter((b) => b.group === group)
            .map((b) => (
              <section key={b.id}>
                <h3>{b.title}</h3>
                {b.rows.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    className="hg-row"
                    aria-label={`${b.title}: ${r.label}, ${r.claims.toLocaleString()} claims`}
                    disabled={!r.claims}
                    onClick={() => open(`${b.title}: ${r.label}`, r)}
                  >
                    <span>
                      {r.key && mark(r.key)}
                      {r.label}
                    </span>
                    <b>{r.claims.toLocaleString()}</b>
                  </button>
                ))}
                {b.note && <p className="hg-note">{b.note}</p>}
              </section>
            ))}
          <h3>By nature</h3>
          {Object.entries(t.natures).map(([n, v]) => (
            <div key={n} className="hg-row plain">
              <span>{nice(n)}</span>
              <b>{v.toLocaleString()}</b>
            </div>
          ))}
          <p className="hg-proto">Prototype figures. Not adjudicated.</p>
        </aside>

        <div className="hg-main">
          <div className="chips" role="group" aria-label="Category">
            <button type="button" className="chip" aria-pressed={!category} onClick={() => setCategory(null)}>
              All
            </button>
            {categories.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                {mark(c)}
                {nice(c)}
              </button>
            ))}
          </div>
          <p aria-live="polite" className={`hg-caption${hovered ? " on" : ""}`}>
            {hovered ? describe(hovered, byId) : "Hover a hull to see what it joins."}
          </p>
          <div className="hg-scroll">
            <svg ref={svgRef} className="hg-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`UNICEF Supply Division ${group === "esg" ? "ESG" : "supply operations"} claims hypergraph`} />
          </div>
          <details className="hg-help">
            <summary>How to read this diagram</summary>
            <p>
              Each shaded hull is one group of claims that ties several things together at once, where a plain line could only join two.
              Every hull includes UNICEF Supply Division, because every claim here comes from its own reports.
            </p>
            {group === "esg" ? (
              <p>
                An <b>ESG hull</b> is one ESG topic. It joins the topic (circle), any framework named in at least 3 of its claims (hexagon) and the two
                PDFs holding the largest share of its claims (diamonds). The pillar is shown by the outline: solid teal environmental, dashed magenta social, dotted slate governance. Hulls that share a
                framework or a PDF overlap, which shows where topics draw on the same standard or report.
              </p>
            ) : (
              <p>
                A <b>supply operations hull</b> is one claim category and one topic, for example shipments that mention vaccines. It joins the topic
                (circle) and the PDF holding the largest share of those claims (diamond). Colour is the category. The same topic can sit in several hulls, one per
                category it appears in.
              </p>
            )}
            <p>A hull's size comes from the layout, not from how many claims it holds. The count is in its caption and in the claims panel.</p>
            <p className="quiet">
              Square: UNICEF Supply Division. Circles: topics. Hexagons: frameworks. Diamonds: source PDFs. ESG claims are those whose text matches the
              existing vocabulary of an ESG topic, so some climate claims that match no pattern stay under Supply operations; every other claim in
              the KB is under Supply operations. The two groups are never drawn together.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
