import { useMemo } from "react";
import { scaleLinear } from "d3";
import { useBuyerJson, type Evidence, type Figure, type Profile } from "../lib/buyer";
import type { PanelItem } from "../components/SourcePanel";

const YEARS = ["2019", "2024", "2025"];

const COLUMNS: { key: string; label: string; match: (concept: string) => boolean }[] = [
  { key: "sbti", label: "SBTi", match: (c) => c === "framework_sbti" },
  { key: "ops", label: "Operations", match: (c) => ["scope_1", "scope_2", "metric_emissions_intensity"].includes(c) },
  { key: "chain", label: "Value chain", match: (c) => c === "scope_3" || c.startsWith("scope3_cat_") },
  { key: "energy", label: "Energy", match: (c) => ["metric_energy", "metric_renewable_share"].includes(c) },
];

interface Cell {
  supplier: string;
  concept: string;
  claims: number;
  natures: Record<string, number>;
  items: Evidence[];
}

// Own-report mix, counted over every deduplicated claim (own_by_nature), never over the held sample.
const MIX: { key: string; label: string }[] = [
  { key: "actual", label: "measured" },
  { key: "target", label: "targets" },
  { key: "commitment", label: "commitments" },
  { key: "projection", label: "projections" },
];

const FUTURE = ["target", "commitment", "projection"];

const usd = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B`
  : v >= 999_500 ? `$${(v / 1e6).toFixed(1)}M`
  : v >= 1e3 ? `$${Math.round(v / 1e3)}K`
  : `$${Math.round(v)}`;

const spendOf = (p: Profile, y: string) => p.spend?.years[y]?.value ?? null;

// A spend cell as a Figure; a missing cell is a gap, never zero.
function spendFigure(p: Profile, y: string): Figure {
  const s = p.spend?.years[y];
  if (s) return { ...s, unit: "USD" };
  return {
    value: null,
    unit: "USD",
    tier: "gap",
    source: "No Annex 2 row for this supplier and year",
    added_by: "apps/public-sector /suppliers, from the absence of a row",
  };
}

function order(profiles: Profile[]): Profile[] {
  return profiles.slice().sort((a, b) => {
    const [sa, sb] = [spendOf(a, "2025"), spendOf(b, "2025")];
    if (sa !== null && sb !== null) return sb - sa;
    if (sa !== null) return -1;
    if (sb !== null) return 1;
    return b.own_total - a.own_total;
  });
}

export default function Suppliers({ onOpen }: { onOpen: (i: PanelItem) => void }) {
  const sup = useBuyerJson<{ profiles: Profile[] }>("suppliers");
  const cli = useBuyerJson<{ cells: Cell[] }>("climate");
  const rows = useMemo(() => (sup.data ? order(sup.data.profiles) : []), [sup.data]);
  const max = useMemo(
    () => Math.max(0, ...rows.flatMap((p) => YEARS.map((y) => spendOf(p, y) ?? 0))),
    [rows],
  );
  const h = scaleLinear().domain([0, max || 1]).range([2, 28]);

  const error = sup.error ?? cli.error;
  if (error) return <p className="empty" role="alert">{error}</p>;
  if (!sup.data || !cli.data) return <p className="empty">Loading suppliers.</p>;

  const cells = cli.data.cells;

  function group(p: Profile, col: (typeof COLUMNS)[number]) {
    const mine = cells.filter((c) => c.supplier === p.id && col.match(c.concept));
    const sum = (ns: string[]) => mine.reduce((t, c) => t + ns.reduce((u, n) => u + (c.natures[n] ?? 0), 0), 0);
    const seen = new Set<string>();
    const items: Evidence[] = [];
    for (const c of mine)
      for (const it of c.items) {
        const k = `${it.text}|${it.pdf}|${it.page}`;
        if (!seen.has(k)) {
          seen.add(k);
          items.push(it);
        }
      }
    const claims = mine.reduce((t, c) => t + c.claims, 0);
    return { items, claims, future: sum(FUTURE), actual: sum(["actual"]) };
  }

  function openGroup(p: Profile, col: (typeof COLUMNS)[number], g: ReturnType<typeof group>) {
    const note = !g.items.length
      ? `the page holds none of these claims' text; ${g.claims} claims in the KB`
      : g.claims > g.items.length
        ? `model-extracted, not source-checked; the page holds ${g.items.length} of ${g.claims}`
        : "model-extracted, not source-checked";
    onOpen({
      title: `${p.name}, ${col.label}`,
      figure: {
        value: null,
        tier: "claim_extracted",
        source: `${g.claims} claims in the supplier's own reports`,
        added_by: "vaccine suppliers KB build 2, model-extracted",
        note,
      },
      evidence: g.items,
    });
  }

  function openMix(p: Profile) {
    const n = (k: string) => p.own_by_nature[k] ?? 0;
    onOpen({
      title: `${p.name}, own-report claims`,
      figure: {
        value: p.own_total,
        unit: "claims",
        tier: "claim_extracted",
        source: `${p.own_total} emissions claims in the supplier's own reports, deduplicated`,
        added_by: "build_suppliers.py",
        note: MIX.map((m) => `${n(m.key)} ${m.label}`).join(", "),
      },
      evidence: p.own_claims,
      note: `examples, not the mix: the page holds ${p.own_claims.length} of ${p.own_total}`,
    });
  }

  function openName(p: Profile) {
    const seen = new Set<string>();
    const evidence = p.unicef_claims.filter((c) => !seen.has(c.text) && seen.add(c.text));
    onOpen({
      title: `${p.name}, UNICEF spend 2025`,
      figure: spendFigure(p, "2025"),
      evidence,
      summary: {
        columns: COLUMNS.map((col) => {
          const g = group(p, col);
          const state =
            g.actual > 0 && g.future > 0 ? "measured and stated for the future"
            : g.actual > 0 ? "measured"
            : g.future > 0 ? "stated for the future"
            : "none in saved reports";
          return { label: col.label, state };
        }),
        mix: MIX.map((m) => ({ ...m, n: p.own_by_nature[m.key] ?? 0 })),
      },
      note: p.boundary_hold
        ? "Reporting boundary not resolved for this supplier. Check which entity a figure covers before using it."
        : undefined,
    });
  }

  return (
    <main className="grid-page">
      <h2>Who carries UNICEF vaccine spend, and what do they say about their climate performance?</h2>
      <p className="sub">
        Spend is the Annex 2 parent total. Climate marks come from each supplier's own reports and are model-extracted.
        Select a bar or a mark to see where it is written.
      </p>
      <div className="sgrid" role="table" aria-label="UNICEF spend and supplier climate statements">
        <div className="sg-head" role="row">
          <span role="columnheader">Supplier</span>
          {YEARS.map((y) => <span key={y} role="columnheader">{y}</span>)}
          {COLUMNS.map((c) => <span key={c.key} role="columnheader">{c.label}</span>)}
          <span role="columnheader">Own-report claims</span>
        </div>
        {rows.map((p) => (
          <div className="sg-row" role="row" key={p.id}>
            <span role="cell" className="sg-name">
              <button type="button" onClick={() => openName(p)}>{p.name}</button>
              {p.boundary_hold && <abbr className="hold-mark" title="Reporting boundary not resolved">!</abbr>}
            </span>
            {YEARS.map((y) => {
              const v = spendOf(p, y);
              return (
                <span role="cell" key={y} className="sg-spend">
                  <button
                    type="button"
                    aria-label={`${p.name}, UNICEF spend ${y}: ${v !== null ? usd(v) : "not in the annex"}`}
                    onClick={() => onOpen({ title: `${p.name}, UNICEF spend ${y}`, figure: spendFigure(p, y) })}
                  >
                    <i className={`sb${v === null ? " none" : ""}`} style={{ height: v === null ? 28 : h(v) }} />
                    <span>{v !== null ? usd(v) : "not in the annex"}</span>
                  </button>
                </span>
              );
            })}
            {COLUMNS.map((col) => {
              const g = group(p, col);
              const both = g.actual > 0 && g.future > 0;
              const [cls, what] = both
                ? ["both", "measured and stated for the future"]
                : g.actual > 0
                  ? ["dot", "measured"]
                  : g.future > 0
                    ? ["ring", "stated for the future"]
                    : ["none", "no claim in the saved reports"];
              return (
                <span role="cell" key={col.key} className="sg-cell">
                  <button
                    type="button"
                    className={`mk ${cls}`}
                    aria-label={`${p.name}, ${col.label}: ${what}`}
                    onClick={() => openGroup(p, col, g)}
                  />
                </span>
              );
            })}
            <span role="cell" className="sg-mix">
              {p.own_total === 0 ? (
                <span className="count">no claims in the saved reports</span>
              ) : (
                <button
                  type="button"
                  aria-label={`${p.name}, own-report claims: ${p.own_total} total, ${MIX.map((m) => `${p.own_by_nature[m.key] ?? 0} ${m.label}`).join(", ")}`}
                  onClick={() => openMix(p)}
                >
                  <span className="mixbar">
                    {MIX.filter((m) => (p.own_by_nature[m.key] ?? 0) > 0).map((m) => (
                      <i
                        key={m.key}
                        className={`seg ${m.key}`}
                        style={{ flexGrow: p.own_by_nature[m.key] }}
                        title={`${p.own_by_nature[m.key]} ${m.label}`}
                      />
                    ))}
                  </span>
                  <span className="count">
                    {MIX.filter((m) => (p.own_by_nature[m.key] ?? 0) > 0)
                      .map((m) => {
                        const n = p.own_by_nature[m.key];
                        return `${n} ${n === 1 ? m.label.replace(/s$/, "") : m.label}`;
                      })
                      .join(" · ")}
                  </span>
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <ul className="sg-legend">
        <li><i className="seg actual" /> measured</li>
        <li><i className="seg target" /> targets</li>
        <li><i className="seg commitment" /> commitments</li>
        <li><i className="seg projection" /> projections</li>
        <li><i className="mk dot" /> measured</li>
        <li><i className="mk ring" /> future only (target, commitment, projection)</li>
        <li><i className="mk both" /> both</li>
        <li><i className="mk none" /> none saved</li>
        <li><i className="sb none" /> not in the annex, not zero</li>
        <li><abbr className="hold-mark">!</abbr> reporting boundary not resolved</li>
      </ul>
      <p className="count">
        Tiers: reported = Annex 2 figure as published; claim_extracted = model-extracted from a supplier report, not
        source-checked; gap = no row.
      </p>
    </main>
  );
}
