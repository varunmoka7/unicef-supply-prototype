import { useMemo, useState } from "react";
import { linkHorizontal, scaleLinear } from "d3";
import "./Climate.css";

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

const W = 1080;
const PITCH = 30;
const TOP = 30;
const LEFT_X = 340;
const RIGHT_X = 700;
const GROUP_GAP = 14;
const link = linkHorizontal();

export default function ClimateHypergraph({ data, onSelect }: Props) {
  const [natures, setNatures] = useState<Set<Nature>>(new Set(NATURES));
  const [groups, setGroups] = useState<Set<Group>>(new Set(GROUPS.map((g) => g.id)));
  const [supplier, setSupplier] = useState<string>("");
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);


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
    const width = scaleLinear().domain([0, max]).range([1.5, 8]);
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
  return (
    <section aria-label="Climate hypergraph" className="cl">
      <div className="cl-legend">
        <div className="chips" role="group" aria-label="Claim nature">
          {NATURES.map((n) => (
            <button key={n} type="button" className="chip cl-nature" data-n={n} aria-pressed={natures.has(n)} onClick={() => toggle(natures, n, setNatures)}>
              {n}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Concept groups">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" className="chip" aria-pressed={groups.has(g.id)} onClick={() => toggle(groups, g.id, setGroups)}>
              {g.label}
            </button>
          ))}
        </div>
        <label className="cl-supplier">
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
      <p className="cl-key">
        Ribbon width is the number of contexts. <span className="cl-dash" aria-hidden="true" /> Dashed ribbons have contexts but no claims. Ribbon colour is the most common nature among the selected ones.
      </p>

      <div className="cl-scroll">
      <svg className="cl-svg" viewBox={`0 0 ${W} ${L.height}`} role="group" aria-label="Suppliers on the left, climate concepts on the right, one ribbon per cell with contexts">
        <text className="cl-colhead" x={LEFT_X - 12} y={16} textAnchor="end">
          Suppliers
        </text>
        <text className="cl-colhead" x={RIGHT_X + 12} y={16}>
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
              className="cl-cell"
            >
              {k === focused && (
                <path className="cl-focus" d={d} strokeWidth={L.width(c.contexts) + 6} />
              )}
              <path className="cl-hit" d={d} strokeWidth={Math.max(12, L.width(c.contexts))} />
              <path
                className="cl-rib"
                data-n={noClaims ? "none" : dominant(c)}
                d={d}
                strokeWidth={L.width(c.contexts)}
                strokeDasharray={noClaims ? "4 3" : undefined}
                opacity={dim ? 0.08 : k === active || k === focused ? 0.95 : 0.3}
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
              <circle className={n ? "cl-dot" : "cl-dot cl-empty"} cx={LEFT_X} cy={y} r={4} />
              {s.boundary_hold && (
                <g className="cl-tag">
                  <rect x={4} y={y - 10} width={128} height={20} />
                  <text x={10} y={y + 4}>boundary hold</text>
                </g>
              )}
              <text className={n ? "cl-lab" : "cl-lab cl-mute"} x={LEFT_X - 12} y={y + 4} textAnchor="end">
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
              <circle className="cl-dot" cx={RIGHT_X} cy={y} r={4} />
              <text className="cl-lab" x={RIGHT_X + 12} y={y + 4}>
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
    </section>
  );
}
