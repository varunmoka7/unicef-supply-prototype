import { useCallback, useEffect, useRef, useState } from "react";
import type { Evidence, Figure } from "../lib/buyer";
import preparedEvidence from "../../buyers/unicef/data/report-evidence.json";
import reportPages from "../../buyers/unicef/data/report-pages.json";
import ReportViewer, { type ReportEvidence } from "./ReportViewer";

export interface PanelItem {
  title: string;
  figure?: Figure;
  evidence?: Evidence[];
  note?: string;
  summary?: {
    columns: { label: string; state: string }[];
    mix: { key: string; label: string; n: number }[];
  };
}

function reportFor(e: Evidence): ReportEvidence | undefined {
  const prepared = preparedEvidence.find((r) => r.text === e.text && r.pdf === e.pdf && r.page === e.page);
  if (prepared) return prepared;
  const p = reportPages.find((r) => r.pdf === e.pdf && r.page === e.page);
  return p && { text: e.text, pdf: p.pdf, page: p.page, image: p.image, width: p.width, height: p.height, highlights: [] };
}

export const plain = (s: string) => s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="sp-row">
      <div className="sp-label">{props.label}</div>
      <div className="sp-value">{props.children}</div>
    </div>
  );
}

function ClaimBox({ e, report, onReport }: { e: Evidence; report?: ReportEvidence; onReport: (report: ReportEvidence) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className={`claim${open ? " open" : ""}`} aria-expanded={report ? undefined : open}
      aria-haspopup={report ? "dialog" : undefined} onClick={() => report ? onReport(report) : setOpen(!open)}>
      {e.nature && <span className={`claim-nature ${e.nature}`}>{e.nature === "actual" ? "measured" : e.nature}</span>}
      <span className="claim-text">{plain(e.text)}</span>
      <span className="claim-foot">
        {e.pdf} · page {e.page}
        {e.needs_review && <b className="claim-review"> · needs review</b>}
        {report && <span> · {report.highlights.length ? "View highlighted report page" : "View cited report page"}</span>}
      </span>
    </button>
  );
}

function byYear(evidence: Evidence[]): { year: string; items: Evidence[] }[] {
  const groups = new Map<string, Evidence[]>();
  for (const e of evidence) {
    const y = e.year === null || e.year === undefined || e.year === "" ? "no year" : String(e.year);
    groups.set(y, [...(groups.get(y) ?? []), e]);
  }
  const years = [...groups.keys()].filter((y) => y !== "no year").sort((a, b) => b.localeCompare(a));
  if (groups.has("no year")) years.push("no year");
  return years.map((year) => ({ year, items: groups.get(year)! }));
}

export default function SourcePanel(props: {
  item: PanelItem | null;
  tiers: Record<string, string>;
  onClose: () => void;
  supplierCounts?: boolean;
}): JSX.Element | null {
  const { item, tiers, onClose } = props;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [report, setReport] = useState<ReportEvidence | null>(null);
  const closeReport = useCallback(() => setReport(null), []);

  useEffect(() => { setReport(null); }, [item]);

  useEffect(() => {
    if (!item) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => { opener?.focus(); };
  }, [item, onClose]);

  useEffect(() => {
    if (!item || report) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [item, onClose, report]);

  if (!item) return null;
  const f = item.figure;

  return (
    <>
    <aside className="sp-panel" role="dialog" aria-label="Source">
      <button ref={closeRef} type="button" className="sp-close" aria-label="Close source panel" onClick={onClose}>
        ×
      </button>
      <Row label="Figure">{item.title}</Row>
      {f && (
        <>
          {(f.value !== null || f.unit) && (
            <Row label="Value">
              {f.value === null ? "not in the annex" : `${f.value.toLocaleString()}${f.unit ? ` ${f.unit}` : ""}`}
            </Row>
          )}
          <Row label="Tier">
            <span className="sp-badge">{f.tier}</span> {tiers[f.tier]}
          </Row>
          <Row label="Source">{f.source}</Row>
          <Row label="Added by">{f.added_by}</Row>
          {f.flag && <Row label="Flag">{f.flag}</Row>}
          {f.note && <Row label="Note">{f.note}</Row>}
        </>
      )}
      {item.note && <Row label="Note">{item.note}</Row>}
      {props.supplierCounts && item.evidence && !f && (
        <Row label="Counting method">The grid reads the saved extracted-claim count for this supplier and concept. Nature counts classify those claims. These counts are not emission estimates.</Row>
      )}
      {item.summary && (
        <div className="sp-summary">
          <div className="sum-grid">
            {item.summary.columns.map((c) => (
              <div className={`sum-tile${c.state === "none in saved reports" ? " none" : ""}`} key={c.label}>
                <b>{c.label}</b>
                <span>{c.state}</span>
              </div>
            ))}
          </div>
          <span className="mixbar">
            {item.summary.mix.filter((m) => m.n > 0).map((m) => (
              <i key={m.key} className={`seg ${m.key}`} style={{ flexGrow: m.n }} title={`${m.n} ${m.label}`} />
            ))}
          </span>
          <p className="count">{item.summary.mix.map((m) => `${m.n} ${m.label}`).join(" · ")}</p>
        </div>
      )}
      {item.evidence && item.evidence.length > 0 && (
        <div className="sp-claims">
          <div className="sp-label">Evidence</div>
          {byYear(item.evidence).map((g) => (
            <section className="claim-group" key={g.year}>
              <h3>{g.year}</h3>
              <div>{g.items.map((e, i) => <ClaimBox e={e} key={i} onReport={setReport}
                report={reportFor(e)} />)}</div>
            </section>
          ))}
        </div>
      )}
    </aside>
    {report && <ReportViewer evidence={report} onClose={closeReport} />}
    </>
  );
}
