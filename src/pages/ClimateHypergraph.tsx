import { useMemo, useState } from "react";
import { linkHorizontal, scaleLinear } from "d3";

export type Nature = "target" | "commitment" | "actual" | "projection";
export const NATURES: Nature[] = ["target", "commitment", "actual", "projection"];
export const NATURE_COLOUR: Record<Nature, string> = {
  target: "#0b5cad",
  commitment: "#6a4fb3",
  actual: "#1b7f4b",
  projection: "#b5791a",
};

type Group = "framework" | "metric" | "scope";
const GROUPS: { id: Group; label: string }[] = [
  { id: "framework", label: "Frameworks" },
  { id: "metric", label: "Metrics" },
  { id: "scope", label: "Scopes and Scope 3 categories" },
];

type Claim = { text: string; nature: Nature; pdf: string; page: number; year?: number | null; needs_review?: boolean };
type Cell = {
  supplier: string;
  concept: string;
  contexts: number;
  claims: number;
  natures: Record<Nature, number>;
  items: Claim[];
};
export type ClimateData = {
  suppliers: { id: string; name: string; boundary_hold: boolean }[];
  concepts: { id: string; label: string; group: string }[];
  cells: Cell[];
};
type BuyerLike = { disclaimers?: string[]; colours?: { ink?: string; mute?: string; line?: string; warn?: string } };

export type Selection = {
  title: string;
  figure?: { value: number | string; unit: string; source: string; tier: string; added_by: string; flag?: string; note?: string };
  claims: Claim[];
  note?: string;
  scope?: { supplier: string; concept: string };
};

type Props = { data: ClimateData; buyer: BuyerLike; onSelect: (s: Selection) => void };

const W = 980;
const PITCH = 26;
const TOP = 28;
const LEFT_X = 230;
const RIGHT_X = 740;
const GROUP_GAP = 14;
const link = linkHorizontal();

export default function ClimateHypergraph({ data, buyer, onSelect }: Props) {
  const [natures, setNatures] = useState<Set<Nature>>(new Set(NATURES));
  const [groups, setGroups] = useState<Set<Group>>(new Set(GROUPS.map((g) => g.id)));
  const [supplier, setSupplier] = useState<string>("");
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const ink = buyer.colours?.ink ?? "#17202a";
  const mute = buyer.colours?.mute ?? "#5f6b76";
  const warn = buyer.colours?.warn ?? "#a8321f";

  const L = useMemo(() => {
    const suppliers = data.suppliers.filter((s) => !supplier || s.id === supplier);
    const concepts = data.concepts.filter((c) => groups.has(c.group as Group));
    const sY = new Map(suppliers.map((s, i) => [s.id, TOP + i * PITCH + PITCH / 2]));
    const cY = new Map<string, number>();
    let y = TOP;
    let prev = "";
    for (const c of concepts) {
      if (prev && c.group !== prev) y += GROUP_GAP;
      cY.set(c.id, y + PITCH / 2);
      y += PITCH;
      prev = c.group;
    }
    // cells with contexts but no claims carry no nature: shown only while no nature is filtered out
    const allNatures = natures.size === NATURES.length;
    const sOrder = new Map(data.suppliers.map((s, i) => [s.id, i]));
    const cOrder = new Map(data.concepts.map((c, i) => [c.id, i]));
    const cells = data.cells
      .slice()
      .sort((a, b) => sOrder.get(a.supplier)! - sOrder.get(b.supplier)! || cOrder.get(a.concept)! - cOrder.get(b.concept)!)
      .filter(
      (c) =>
        sY.has(c.supplier) &&
        cY.has(c.concept) &&
        (c.claims === 0 ? allNatures : NATURES.some((n) => natures.has(n) && c.natures[n] > 0)),
    );
    const max = Math.max(1, ...data.cells.map((c) => c.contexts));
    const width = scaleLinear().domain([0, max]).range([2, 16]);
    return { suppliers, concepts, sY, cY, cells, width, height: Math.max(y, TOP + suppliers.length * PITCH) + 12 };
  }, [data, natures, groups, supplier]);

  const toggle = <T,>(set: Set<T>, v: T, put: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    put(next);
  };

  const supplierName = (id: string) => data.suppliers.find((s) => s.id === id)?.name ?? id;
  const conceptLabel = (id: string) => data.concepts.find((c) => c.id === id)?.label ?? id;
  const key = (c: Cell) => `${c.supplier}|${c.concept}`;

  const open = (c: Cell) => {
    setPicked(key(c));
    const claims = c.items.filter((i) => natures.has(i.nature));
    const total = NATURES.reduce((n, k) => n + (natures.has(k) ? c.natures[k] : 0), 0);
    const note =
      c.claims === 0
        ? `${c.contexts} contexts, no claims extracted: a gap, not zero.`
        : claims.length < total
          ? `Showing ${claims.length} of ${total} claims; the rest are not in the extract.`
          : undefined;
    const isScope = data.concepts.find((x) => x.id === c.concept)?.group === "scope";
    onSelect({ title: `${supplierName(c.supplier)}: ${conceptLabel(c.concept)}`, claims, note, scope: isScope ? { supplier: c.supplier, concept: c.concept } : undefined });
  };

  const dominant = (c: Cell): Nature =>
    NATURES.filter((n) => natures.has(n)).sort((a, b) => c.natures[b] - c.natures[a])[0];

  const livePicked = picked && L.cells.some((c) => key(c) === picked) ? picked : null;
  const active = hover ?? livePicked;
  const btn = (on: boolean, colour: string): React.CSSProperties => ({
    border: 0,
    background: on ? colour : "#f4f4f4",
    color: on ? "#fff" : ink,
    padding: "10px 16px",
    minHeight: 44,
    fontSize: 15,
    cursor: "pointer",
  });

  return (
    <section aria-label="Climate hypergraph" style={{ color: ink }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        {NATURES.map((n) => (
          <button key={n} type="button" aria-pressed={natures.has(n)} style={btn(natures.has(n), NATURE_COLOUR[n])} onClick={() => toggle(natures, n, setNatures)}>
            {n}
          </button>
        ))}
        <span style={{ width: 12 }} />
        {GROUPS.map((g) => (
          <button key={g.id} type="button" aria-pressed={groups.has(g.id)} style={btn(groups.has(g.id), ink)} onClick={() => toggle(groups, g.id, setGroups)}>
            {g.label}
          </button>
        ))}
        <label style={{ fontSize: 15, marginLeft: "auto" }}>
          Supplier{" "}
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">All {data.suppliers.length}</option>
            {data.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${L.height}`} width="100%" role="group" aria-label="Suppliers on the left, climate concepts on the right, one ribbon per cell with contexts">
        <text x={LEFT_X - 12} y={14} textAnchor="end" fontSize={11} fill={mute}>
          Suppliers
        </text>
        <text x={RIGHT_X + 12} y={14} fontSize={11} fill={mute}>
          Concepts
        </text>

        {L.cells.map((c) => {
          const y0 = L.sY.get(c.supplier)!;
          const y1 = L.cY.get(c.concept)!;
          const d = link({ source: [LEFT_X, y0], target: [RIGHT_X, y1] }) ?? "";
          const k = key(c);
          const dim = active !== null && active !== k && !(active.startsWith(c.supplier + "|") || active.endsWith("|" + c.concept));
          const noClaims = c.claims === 0;
          return (
            <g
              key={k}
              role="button"
              tabIndex={0}
              aria-pressed={k === livePicked}
              aria-label={`${supplierName(c.supplier)}, ${conceptLabel(c.concept)}: ${c.contexts} contexts, ${c.claims} claims`}
              onClick={() => open(c)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(c))}
              onMouseEnter={() => setHover(k)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setFocused(k)}
              onBlur={() => setFocused(null)}
              style={{ cursor: "pointer", outline: "none" }}
            >
              {k === focused && (
                <path d={d} fill="none" stroke={ink} strokeWidth={L.width(c.contexts) + 6} strokeDasharray="2 2" />
              )}
              <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(12, L.width(c.contexts))} />
              <path
                d={d}
                fill="none"
                stroke={noClaims ? mute : NATURE_COLOUR[dominant(c)]}
                strokeWidth={L.width(c.contexts)}
                strokeDasharray={noClaims ? "4 3" : undefined}
                opacity={dim ? 0.1 : k === active || k === focused ? 0.95 : 0.5}
              />
              <title>{`${supplierName(c.supplier)}, ${conceptLabel(c.concept)}: ${c.contexts} contexts, ${c.claims} claims${noClaims ? " (contexts only, no claims)" : ""}`}</title>
            </g>
          );
        })}

        {L.suppliers.map((s) => {
          const y = L.sY.get(s.id)!;
          const n = data.cells.filter((c) => c.supplier === s.id).length;
          return (
            <g key={s.id}>
              <circle cx={LEFT_X} cy={y} r={4} fill={n ? ink : "#fff"} stroke={ink} />
              <text x={LEFT_X - 12} y={y + 4} textAnchor="end" fontSize={12} fill={n ? ink : mute}>
                {s.boundary_hold && (
                  <tspan fill={warn} fontWeight={600}>
                    [boundary hold]{" "}
                  </tspan>
                )}
                {s.name}
                {n === 0 ? " (no cells)" : ""}
              </text>
            </g>
          );
        })}

        {L.concepts.map((c) => {
          const y = L.cY.get(c.id)!;
          return (
            <g key={c.id}>
              <circle cx={RIGHT_X} cy={y} r={4} fill={ink} />
              <text x={RIGHT_X + 12} y={y + 4} fontSize={12} fill={ink}>
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>

      <p style={{ fontSize: 14, color: mute, margin: "12px 0 0", maxWidth: "60em" }}>
        Ribbon width is the number of contexts. Dashed ribbons have contexts but no claims. Colour is the most common nature among the selected ones.
      </p>
      {buyer.disclaimers?.map((d) => (
        <p key={d} style={{ fontSize: 14, color: mute, margin: "2px 0" }}>
          {d}
        </p>
      ))}
    </section>
  );
}
