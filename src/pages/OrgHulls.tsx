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
const H = 680;
const GROUPS: { id: Group; label: string }[] = [
  { id: "esg", label: "ESG claims" },
  { id: "operations", label: "Supply operations" },
];
const NODE_COLOUR: Record<NodeType, string> = { company: "#1a1a2e", topic: "#1565C0", framework: "#E65100", evidence: "#78909C" };
const CATEGORY_COLOUR: Record<string, string> = {
  // ESG pillars, Tata view colours
  environmental: "#4CAF50",
  social: "#2196F3",
  governance: "#FF9800",
  // supply operations categories
  procurement_spend: "#5c6bc0",
  shipment: "#00838f",
  market: "#b5791a",
  tender: "#6a4fb3",
  policy_requirement: "#ad1457",
  product_quality: "#c62828",
  climate: "#558b2f",
  other: "#78909c",
};
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
      .force("charge", d3.forceManyBody().strength(-260))
      .force("collision", d3.forceCollide(40))
      .force("x", d3.forceX(W / 2).strength(0.04))
      .force("y", d3.forceY(H / 2).strength(0.04))
      .force("link", d3.forceLink(links).distance(150).strength(0.25));

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
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer");

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
      .attr("font-size", (d) => (d.type === "company" ? 14 : d.type === "evidence" ? 9 : 10))
      .attr("font-weight", (d) => (d.type === "company" ? 700 : 400))
      .attr("fill", (d) => (d.type === "evidence" ? "#5f6b76" : "#333"))
      .attr("pointer-events", "none");

    const isolate = (d: Edge | null) => {
      setHovered(d);
      hulls
        .attr("fill-opacity", (h) => (!d ? 0.12 : h === d ? 0.35 : 0.04))
        .attr("stroke-opacity", (h) => (!d ? 0.6 : h === d ? 1 : 0.15));
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
      hulls.attr("d", (d) => {
        const h = hullPoints(d.members, 28);
        return h ? `M${h.join("L")}Z` : null;
      });
      nodeG.attr("transform", (d) => `translate(${d.x},${d.y})`);
      labels.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });
    return () => {
      sim.stop();
      svg.on(".zoom", null);
      svg.selectAll("*").remove();
    };
  }, [data, shown]);

  // category colour marks a dot only; text and borders stay dark or grey for contrast
  const chip = (on: boolean): React.CSSProperties => ({
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: on ? "#17202a" : "#dde2e7",
    background: on ? "#eef1f4" : "#fff",
    color: "#17202a",
    fontWeight: on ? 600 : 400,
    borderRadius: 16,
    padding: "4px 12px",
    margin: "0 6px 6px 0",
    cursor: "pointer",
  });
  const dot = (colour: string) => (
    <i aria-hidden style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colour, marginRight: 8 }} />
  );
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e6e9ee", borderRadius: 10, padding: 14 };
  const label: React.CSSProperties = { fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "#5f6b76", fontWeight: 600, margin: "14px 0 6px" };
  const kpi = (name: string, value: number, note?: string) => (
    <div key={name} style={card}>
      <div style={{ fontSize: 12, color: "#5f6b76" }}>{name}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{value.toLocaleString()}</div>
      {note && <div style={{ fontSize: 12, color: "#5f6b76" }}>{note}</div>}
    </div>
  );
  const listRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", width: "100%", borderStyle: "solid", borderWidth: "0 0 1px", borderColor: "#f0f2f5", background: "none", padding: "6px 0", color: "#17202a", font: "inherit", textAlign: "left" };
  const t = data.stats[group];
  const pickGroup = (g: Group) => {
    setGroup(g);
    setCategory(null);
    setHovered(null);
  };

  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: "#5f6b76", maxWidth: 640 }}>
          {group === "esg"
            ? "ESG claims from UNICEF Supply Division's own reports, grouped by topic. Click any shape or row to read the claims and the page they come from."
            : "Every other claim in the same reports, grouped by claim category and topic. Click any shape or row to read the claims and the page they come from."}
        </p>
        <div role="group" aria-label="Claim group" style={{ display: "inline-flex", background: "#eef1f4", borderRadius: 8, padding: 3 }}>
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={group === g.id}
              onClick={() => pickGroup(g.id)}
              style={{ border: 0, borderRadius: 6, padding: "6px 16px", cursor: "pointer", background: group === g.id ? "#fff" : "transparent", boxShadow: group === g.id ? "0 1px 2px rgba(0,0,0,0.12)" : "none", fontWeight: group === g.id ? 600 : 400, color: "#17202a" }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "16px 0" }}>
        {kpi("Claims", t.claims, `of ${data.stats.kb_claims.toLocaleString()} in the KB`)}
        {kpi("Hyperedges", data.edges.filter((e) => e.group === group).length)}
        {kpi("Documents", t.documents)}
        {kpi("Contexts", t.contexts)}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <aside style={{ ...card, width: 280 }}>
          {data.breakdowns
            .filter((b) => b.group === group)
            .map((b, i) => (
              <section key={b.id}>
                <h3 style={{ ...label, marginTop: i ? 14 : 0 }}>{b.title}</h3>
                {b.rows.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    aria-label={`${b.title}: ${r.label}, ${r.claims.toLocaleString()} claims`}
                    disabled={!r.claims}
                    onClick={() => open(`${b.title}: ${r.label}`, r)}
                    style={{ ...listRow, cursor: r.claims ? "pointer" : "default" }}
                  >
                    <span>
                      {r.key && dot(colourOf(r.key))}
                      {r.label}
                    </span>
                    <span style={{ color: "#5f6b76" }}>{r.claims.toLocaleString()}</span>
                  </button>
                ))}
                {b.note && <p style={{ fontSize: 11, color: "#5f6b76", margin: "4px 0 0" }}>{b.note}</p>}
              </section>
            ))}
          <h3 style={label}>By nature</h3>
          {Object.entries(t.natures).map(([n, v]) => (
            <div key={n} style={{ ...listRow, cursor: "default" }}>
              <span>{nice(n)}</span>
              <span style={{ color: "#5f6b76" }}>{v.toLocaleString()}</span>
            </div>
          ))}
          <p style={{ color: "#8a5a00", fontWeight: 600, margin: "12px 0 0" }}>Prototype figures. Not adjudicated.</p>
        </aside>

        <div style={{ ...card, flex: 1, minWidth: 320 }}>
          <div role="group" aria-label="Category" style={{ marginBottom: 4 }}>
            <button type="button" aria-pressed={!category} style={chip(!category)} onClick={() => setCategory(null)}>
              All
            </button>
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={category === c} style={chip(category === c)} onClick={() => setCategory(c)}>
                {dot(colourOf(c))}
                {nice(c)}
              </button>
            ))}
          </div>
          <p aria-live="polite" style={{ minHeight: 20, margin: "4px 0 6px", color: hovered ? "#17202a" : "#5f6b76", borderLeft: `4px solid ${hovered ? colourOf(hovered.category) : "transparent"}`, paddingLeft: 6 }}>
            {hovered ? describe(hovered, byId) : "Hover a hull to see what it joins."}
          </p>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`UNICEF Supply Division ${group === "esg" ? "ESG" : "supply operations"} claims hypergraph`} style={{ width: "100%", background: "#f8f9fa", borderRadius: 8 }} />
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>How to read this: what a hyperedge is</summary>
            <p style={{ margin: "6px 0" }}>
              Each shaded hull is a <b>hyperedge</b>: one group of claims that ties several things together at once, where a plain line could only join two.
              Every hull includes UNICEF Supply Division, because every claim here comes from its own reports.
            </p>
            {group === "esg" ? (
              <p style={{ margin: "6px 0" }}>
                An <b>ESG hull</b> is one ESG topic. It joins the topic (circle), any framework named in at least 3 of its claims (hexagon) and the two
                PDFs holding the largest share of its claims (diamonds). Colour is the pillar: green environmental, blue social, orange governance. Hulls that share a
                framework or a PDF overlap, which shows where topics draw on the same standard or report.
              </p>
            ) : (
              <p style={{ margin: "6px 0" }}>
                A <b>supply operations hull</b> is one claim category and one topic, for example shipments that mention vaccines. It joins the topic
                (circle) and the PDF holding the largest share of those claims (diamond). Colour is the category. The same topic can sit in several hulls, one per
                category it appears in.
              </p>
            )}
            <p style={{ margin: "6px 0" }}>A hull's size comes from the layout, not from how many claims it holds. The count is in its caption and in the claims panel.</p>
            <p style={{ margin: "6px 0", color: "#5f6b76" }}>
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
