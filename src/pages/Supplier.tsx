import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { useBuyerJson } from "../lib/buyer";
import { plain } from "../components/SourcePanel";
import seriesFile from "../../docs/scope-year-series-2026-10-21.json";
import { COLS, EVIDENCE_CAP, barTotal, claimRows, docName, yearTable, type ClaimRow, type ClimateCell, type Concept, type Series, type Status, type YearRow } from "../lib/supplierPage";
import "./Supplier.css";

// One page per supplier: its climate claims with the page each was read from, the passage on select, and the Scope 1, 2 and 3 figures by year.

interface Climate { suppliers: { id: string; name: string; boundary_hold: boolean }[]; concepts: Concept[]; cells: ClimateCell[] }
const series = seriesFile as unknown as Series;
const NATURE_LABEL: Record<string, string> = { actual: "measured", commitment: "commitment", target: "target", projection: "projection" };
const FILTERS: { key: "all" | Status; label: string }[] = [{ key: "all", label: "All" }, { key: "verified", label: "Verified" }, { key: "unverified", label: "Unverified" }, { key: "flagged", label: "Flagged" }];
const NONE = "\u0000none";
const fN = (n: number | null) => (n === null ? "" : n.toLocaleString("en-US"));
const nb = (s: string) => s.replace(/ /g, " ");
const media = (q: string) => window.matchMedia?.(q).matches ?? false;
const Blank = () => (<><span aria-hidden="true">—</span><span className="sr-only">not published</span></>);

function Evidence({ row, pgRef }: { row: ClaimRow; pgRef?: React.Ref<HTMLDivElement> }): JSX.Element {
  return (
    <>
      <div className="sup-lab"><span className={`sup-st ${row.status}`}>{row.status}</span> · {docName(row.pdf)}</div>
      <div className={`sup-pg${row.status === "unverified" ? " dim" : ""}`} ref={pgRef}><span>p.</span>{row.page}</div>
      <p className="sup-et">{row.label}</p>
      <dl>
        <dt>Period</dt><dd className="mono">{row.period ? nb(row.period) : "not stated"}</dd>
        <dt>Boundary</dt><dd>not stated</dd>
        <dt>Nature</dt><dd>{NATURE_LABEL[row.nature] ?? row.nature}</dd>
      </dl>
      {row.text ? (
        <>
          <blockquote>“{plain(row.text)}”</blockquote>
          <div className="sup-rd">Extracted claim text · wording match, not a judgment of meaning</div>
          {row.status === "unverified" && <p className="sup-sm">Marked needs review in the extraction file. Read the passage on the cited page before relying on it.</p>}
        </>
      ) : (
        <p className="sup-nm">No matching passage found on the cited page.</p>
      )}
      {row.pair && (
        <div className="sup-also">
          <h3>Also reported</h3>
          {row.pair.values.map(([v, page, label]) => (
            <p key={`${page}|${label}`}><b>{fN(v)}</b> · {label} <span className="mono">p.{page}</span></p>
          ))}
          <p className="sup-sm">Flagged pair. Same metric words. Period, boundary and explanation not checked.</p>
        </div>
      )}
    </>
  );
}

function YearTable({ rows, units }: { rows: YearRow[]; units: string[] }): JSX.Element {
  const cols = COLS.filter((c) => c.key !== "s2u" || rows.some((r) => r.cells.s2u.length));
  return (
    <table id="sup-etb">
      <caption>Emissions by year as published, units as printed</caption>
      <thead>
        <tr>
          <th scope="col">Year</th>
          {cols.map((c) => <th scope="col" key={c.key}><abbr title={c.name}><span className="lg">{c.name}</span><span className="sh">{c.short}</span></abbr></th>)}
        </tr>
      </thead>
      <tbody className="mono">
        {rows.length === 0 && <tr><td colSpan={cols.length + 1}><Blank /> <span className="sup-na">no Scope 1, 2 or 3 figure read for this supplier</span></td></tr>}
        {rows.map((r) => (
          <tr key={r.year}>
            <th scope="row">{nb(r.year)}</th>
            {cols.map((c) => (
              <td key={c.key} className={r.cells[c.key].length ? undefined : "sup-na"}>
                {r.cells[c.key].length === 0 && <Blank />}
                {r.cells[c.key].map((v) => (
                  <span className="sup-fig" key={v.printed}>
                    {v.printed}
                    <i>p.{v.pages.join(", ")}{units.length > 1 && v.unit ? ` · ${v.unit}` : ""}{v.notes.map((n) => ` · ${n}`)}</i>
                  </span>
                ))}
                {r.cells[c.key].length > 1 && <i className="sup-flag">flagged pair, same year and metric</i>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SupplierPage({ id, climate }: { id: string; climate: Climate }): JSX.Element {
  const supplier = climate.suppliers.find((s) => s.id === id);
  const claims = useMemo(() => claimRows(id, climate.cells, climate.concepts, series.conflicts), [id, climate]);
  const { rows: years, other } = useMemo(() => yearTable(id, series.figures), [id]);
  const [filt, setFilt] = useState<"all" | Status>("all");
  const [per, setPer] = useState("all");
  const [sel, setSel] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [rove, setRove] = useState<string | null>(null);
  const [path, setPath] = useState<{ d: string; a: [number, number]; b: [number, number] } | null>(null);
  const [live, setLive] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const work = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const pg = useRef<HTMLDivElement>(null);
  const btns = useRef(new Map<string, HTMLButtonElement>());
  const srcCells = useRef(new Map<string, HTMLTableCellElement>());

  const count = (s: Status) => claims.filter((c) => c.status === s).length;
  const periods = useMemo(() => [...new Set(claims.map((c) => c.period).filter((p): p is string => !!p))].sort(), [claims]);
  const shown = claims.filter((c) => (filt === "all" || c.status === filt) && (per === "all" || (per === NONE ? !c.period : c.period === per)));
  const picked = claims.find((c) => c.id === sel) ?? null;
  const active = rove && shown.some((c) => c.id === rove) ? rove : shown[0]?.id;
  const docs = useMemo(() => {
    const pages = new Map<string, Set<number>>();
    for (const [pdf, page] of [...claims.map((c) => [c.pdf, c.page] as const), ...series.figures.filter((f) => f.supplier === id).map((f) => [f.pdf, f.page] as const)])
      pages.set(pdf, (pages.get(pdf) ?? new Set()).add(page));
    return [...pages].map(([pdf, p]) => ({ pdf, pages: p.size }));
  }, [claims, id]);
  const nDocs = new Set(claims.map((c) => c.pdf)).size;
  const units = useMemo(() => [...new Set(years.flatMap((r) => Object.values(r.cells).flat().map((v) => v.unit)).filter(Boolean))], [years]);
  const totals = years.map(barTotal);
  const top = Math.max(0, ...totals.map((t) => t ?? 0));
  const lastYear = years[years.length - 1]?.year;

  // the selected claim leaves the list when a filter hides it
  useEffect(() => { if (sel && !shown.some((c) => c.id === sel)) { setSel(null); setSheet(false); } }, [sel, shown]);
  useEffect(() => {
    const d = dialog.current;
    if (sheet && d && !d.open) d.showModal();
    if (!sheet && d?.open) d.close();
  }, [sheet]);

  const draw = useCallback(() => {
    const w = work.current, c = card.current, p = pg.current, cell = sel ? srcCells.current.get(sel) : null;
    if (!w || !c || !p || !cell || window.innerWidth < 1024) return setPath(null);
    const W = w.getBoundingClientRect(), a = cell.getBoundingClientRect(), cd = c.getBoundingClientRect(), b = p.getBoundingClientRect();
    const x1 = a.right - W.left, y1 = a.top + a.height / 2 - W.top, x2 = cd.left - W.left, y2 = b.top + b.height / 2 - W.top, m = (x2 - x1) / 2;
    setPath({ d: `M${x1} ${y1}C${x1 + m} ${y1} ${x2 - m} ${y2} ${x2} ${y2}`, a: [x1, y1], b: [x2, y2] });
  }, [sel]);
  useLayoutEffect(draw, [draw, filt]);
  useEffect(() => {
    let f = 0;
    const on = () => { cancelAnimationFrame(f); f = requestAnimationFrame(draw); };
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, { passive: true });
    return () => { cancelAnimationFrame(f); window.removeEventListener("resize", on); window.removeEventListener("scroll", on); };
  }, [draw]);

  function pick(c: ClaimRow) {
    setSel(c.id);
    setRove(c.id);
    setLive(`Claim ${claims.indexOf(c) + 1} of ${claims.length}: ${c.label}, ${c.status}, page ${c.page}.`);
    if (media("(max-width: 900px)")) setSheet(true);
  }
  function keys(e: KeyboardEvent, c: ClaimRow) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const next = shown[shown.indexOf(c) + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) { setRove(next.id); btns.current.get(next.id)?.focus(); }
  }

  if (!supplier) {
    return <main className="page sup"><p className="empty" role="alert">No supplier with the id “{id}” in the climate file. <Link to="/suppliers">Back to suppliers</Link></p></main>;
  }
  const reduced = media("(prefers-reduced-motion: reduce)");
  const settle = (children: ReactNode) => <div className={reduced ? undefined : "sup-settle"} key={sel} onAnimationEnd={draw}>{children}</div>;

  return (
    <main className="page sup">
      <p className="sup-back"><Link to="/suppliers">← All suppliers</Link></p>
      <section className="sup-card sup-hero sup-g sup-in" aria-labelledby="sup-name">
        <div className="sup-hl">
          <div className="sup-lab">Supplier · <span className="mono">{id}</span></div>
          <h1 id="sup-name">{supplier.name}</h1>
          {supplier.boundary_hold && <p className="sup-sub">Reporting boundary is not resolved: check which entity a figure covers before using it.</p>}
          <ul className="sup-docs">
            {docs.map((d) => <li key={d.pdf}><span>{docName(d.pdf)}</span><span className="mono">{d.pages}&nbsp;{d.pages === 1 ? "page" : "pages"} cited</span></li>)}
          </ul>
        </div>
        <div className="sup-hr">
          <div className="sup-facts">
            <div className="sup-fact"><div className="sup-fn"><span className="mono">{claims.length}</span><span className="u">claims</span></div><div className="sup-cap">read from <span>{nDocs}</span> {nDocs === 1 ? "document" : "documents"}</div></div>
            <div className="sup-fact"><div className="sup-fn"><span className="mono">{count("verified")}</span><span className="u"><i className="sup-dot bg-verified" />verified</span></div><div className="sup-cap">passage found on the cited page, not a check that the number is right</div></div>
            <div className="sup-fact"><div className="sup-fn"><span className="mono">{count("flagged")}</span><span className="u flagged">flagged pairs</span></div><div className="sup-cap">same metric, two values on different pages · not adjudicated</div></div>
          </div>
        </div>
      </section>

      <div className="sup-work sup-g" ref={work}>
        <section className="sup-card sup-lc sup-in" aria-labelledby="sup-ch">
          <div className="sup-tr">
            <h2 id="sup-ch">Climate claims</h2>
            <div className="sup-pills" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button type="button" key={f.key} aria-pressed={filt === f.key} onClick={() => setFilt(f.key)}>
                  {f.label} <span className="mono">{f.key === "all" ? claims.length : count(f.key)}</span>
                </button>
              ))}
            </div>
            <label className="sup-per">Period
              <select value={per} onChange={(e) => setPer(e.target.value)}>
                <option value="all">All periods</option>
                {periods.map((p) => <option key={p} value={p}>{nb(p)}</option>)}
                {claims.some((c) => !c.period) && <option value={NONE}>Not stated</option>}
              </select>
            </label>
          </div>
          <p className="sup-note">Each row is a claim extracted from a supplier report, up to {EVIDENCE_CAP} per concept. The supplier’s own words appear in the evidence card. Verified means the passage was found, not that the number is right. The Value column stays blank because the claim text is not parsed into numbers.</p>
          <p className="sup-shown" aria-live="polite">{shown.length} of {claims.length} shown</p>
          <table id="sup-claims">
            <caption>Climate claims from {supplier.name} reports, with period, status and source page</caption>
            <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 120 }} /><col style={{ width: 190 }} /></colgroup>
            <thead><tr><th scope="col">Claim</th><th scope="col" style={{ textAlign: "right" }}>Value</th><th scope="col">Period</th><th scope="col">Status</th><th scope="col">Source</th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={5} className="sup-na">No extracted claim for this supplier{filt === "all" && per === "all" ? "" : " with this filter"}. This does not mean no action was taken.</td></tr>}
              {shown.map((c) => (
                <tr key={c.id} className={sel === c.id ? "sel" : undefined} onClick={(e) => { if (!(e.target as HTMLElement).closest(".sup-cb")) btns.current.get(c.id)?.click(); }}>
                  <td>
                    <button type="button" className="sup-cb" aria-pressed={sel === c.id} aria-controls="sup-evidence" tabIndex={active === c.id ? 0 : -1}
                      ref={(el) => { if (el) btns.current.set(c.id, el); else btns.current.delete(c.id); }} onClick={() => pick(c)} onKeyDown={(e) => keys(e, c)}>
                      <span className="sup-ct">{c.label}</span>
                      <span className="sup-cs">{NATURE_LABEL[c.nature] ?? c.nature} · boundary not stated</span>
                    </button>
                  </td>
                  <td className="v mono"><Blank /></td>
                  <td className="per mono">{c.period ? nb(c.period) : <Blank />}</td>
                  <td className={`sup-stc ${c.status}`}><i className={`sup-dot bg-${c.status}`} />{c.status}</td>
                  <td className="src" ref={(el) => { if (el) srcCells.current.set(c.id, el); else srcCells.current.delete(c.id); }}>
                    {docName(c.pdf)}<br /><span className="pr mono">p.{c.page}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="sup-rc sup-in" id="sup-evidence" aria-labelledby="sup-eh">
          <div className="sup-card" ref={card}>
            <h2 id="sup-eh">Evidence</h2>
            <div className="sup-evb">
              {picked && !sheet ? settle(<Evidence row={picked} pgRef={pg} />) : (
                <div className="sup-empty"><p>Select a claim. The passage it was read from appears here with its page.</p><p className="sup-sm">Every passage is a wording match, not a judgment of meaning.</p></div>
              )}
            </div>
          </div>
        </aside>
        <svg className="sup-thread" aria-hidden="true">
          {path && picked && (
            <g key={picked.id}>
              <path className="sup-draw" d={path.d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={1} />
              <circle cx={path.a[0]} cy={path.a[1]} r={1.5} fill="currentColor" />
              <circle cx={path.b[0]} cy={path.b[1]} r={1.5} fill="currentColor" />
            </g>
          )}
        </svg>
      </div>

      <section className="sup-card sup-in" aria-labelledby="sup-emh">
        <h2 id="sup-emh" className="sup-h2s">Emissions as published<small className="mono">{units.length === 1 ? units[0] : "units as printed"}</small></h2>
        <p className="sup-note">Blank means not published in the documents read, never zero. Figures are shown as printed, nothing converted. Where the file holds two different values for the same year and metric, both are shown and marked.</p>
        <div className="sup-g sup-emg">
          <div className="sup-etab"><YearTable rows={years} units={units} /></div>
          <div className="sup-bars">
            <div className="sup-lab">Scope 1 + Scope 2 market-based</div>
            <div className="sup-bw" aria-hidden="true">
              {years.map((r, i) => totals[i] === null
                ? <div className="b np" key={r.year}><div /><span className="mono">{r.year}</span><em>not both published</em></div>
                : <div className={`b${r.year === lastYear ? " cur" : ""}`} key={r.year}><div style={{ height: Math.round((totals[i]! / top) * 64) }} /><span className="mono">{r.year}</span></div>)}
            </div>
            <p className="sup-ctx">{totals.some((t) => t !== null)
              ? "Calculated by GoCarbonTracker: the sum of two published figures for the same year, shown only when both exist. Not a reported figure."
              : "No year has both Scope 1 and Scope 2 market-based published, so no bar is drawn."}</p>
          </div>
        </div>
        {other.length > 0 && (
          <details className="sup-other">
            <summary>Other figures read ({other.length}) that do not fit these columns</summary>
            <ul>
              {other.map((f, i) => (
                <li key={i}><span>{{ s1s2: "Scope 1 + 2", s1: "Scope 1", s2: "Scope 2", s3: "Scope 3" }[f.metric] ?? f.metric}{f.boundary ? ` ${f.boundary}` : ""} · {nb(f.year)}</span> <b className="mono">{f.printed || <Blank />}</b> {f.unit} <span className="mono">p.{f.page}</span></li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <footer className="sup-foot"><span>GoCarbonTracker reads what suppliers publish and ties each figure to a page. It does not rate suppliers.</span><span className="mono">{docs.length} {docs.length === 1 ? "document" : "documents"} · {docs.reduce((a, d) => a + d.pages, 0)} pages cited</span></footer>

      <dialog ref={dialog} className="sup-sheet" aria-labelledby="sup-sh" onClose={() => setSheet(false)}>
        <div className="sup-tr"><h2 id="sup-sh">Evidence</h2><button className="sup-close" type="button" onClick={() => setSheet(false)}>Close</button></div>
        <div className="sup-evb">{picked && sheet && <Evidence row={picked} />}</div>
      </dialog>
      <p className="sr-only" aria-live="polite">{live}</p>
    </main>
  );
}

export default function Supplier(): JSX.Element {
  const { id = "" } = useParams();
  const { data, error } = useBuyerJson<Climate>("climate");
  if (error) return <p className="empty" role="alert">{error}</p>;
  if (!data) return <p className="empty">Loading buyer data.</p>;
  return <SupplierPage id={id} climate={data} />;
}
