import { useEffect, useRef, useState } from "react";
import "./ReportViewer.css";

export interface ReportEvidence {
  text: string;
  pdf: string;
  page: number;
  image: string;
  width: number;
  height: number;
  highlights: { x: number; y: number; width: number; height: number }[];
  verification?: string;
}

const REVIEWED = [/^Accepted after source check/, /^Accepted: (checked against page|verbatim)/, /^Exact report text matched/];

export type Review = "reviewed" | "automatic" | "unverified";

// Unknown or missing verification text is never source-reviewed.
export function reviewOf(verification?: string): Review {
  if (verification && REVIEWED.some((re) => re.test(verification))) return "reviewed";
  if (verification?.startsWith("Automated")) return "automatic";
  return "unverified";
}

const STATUS: Record<Review, string> = {
  reviewed: "Source-reviewed: a reviewer checked this claim against the report page.",
  automatic: "Automatic match: a script located this passage and it has not been individually checked against the report.",
  unverified: "No matching passage was verified. The cited page is shown without a highlight and does not by itself support the claim.",
};

export const reviewStatus = (evidence: ReportEvidence) =>
  STATUS[evidence.highlights.length === 0 ? "unverified" : reviewOf(evidence.verification)];

export default function ReportViewer({ evidence, onClose }: { evidence: ReportEvidence; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState(100);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const pageOnly = evidence.highlights.length === 0;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className="report-viewer" aria-labelledby="report-title" aria-describedby="report-claim"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
      }}>
      <div className="report-toolbar">
        <h2 id="report-title">{evidence.pdf} · page {evidence.page}</h2>
        <label>Zoom <select aria-label="Report zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
          {[100, 150, 200, 300].map((value) => <option key={value} value={value}>{value}%</option>)}
        </select></label>
        <button ref={closeButton} type="button" onClick={onClose}>Close report</button>
      </div>
      <p id="report-claim">Claim: {evidence.text}</p>
      <p id="report-review">{reviewStatus(evidence)}</p>
      {!loaded && !failed && <p role="status">Loading report page.</p>}
      {failed && <p role="alert">The report image could not load. Close the report and try again.</p>}
      <div className="report-scroll" tabIndex={0} role="region" aria-label={pageOnly ? "Full cited report page, no highlighted passage" : "Full report page with highlighted supporting passage"}>
        <div className="report-page" style={{ width: `${zoom}%` }}>
          <img src={evidence.image} width={evidence.width} height={evidence.height}
            alt={`${evidence.pdf}, full page ${evidence.page}. ${pageOnly ? "No passage is highlighted." : "The highlighted region is the passage matched to the claim above."}`}
            onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
          {loaded && evidence.highlights.map((rect, index) => <span key={index} className="report-highlight" aria-hidden="true"
            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }} />)}
        </div>
      </div>
    </dialog>
  );
}
