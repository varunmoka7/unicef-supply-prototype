import { useCallback } from "react";
import { useBuyerJson, type Buyer } from "../lib/buyer";
import type { PanelItem } from "../components/SourcePanel";
import OrgHulls, { type OrgHypergraph, type OrgSelection } from "./OrgHulls";

// UNICEF Supply Division's own reports only, no supplier reports.
export default function Hypergraph({ buyer, onOpen }: { buyer: Buyer; onOpen: (i: PanelItem) => void }): JSX.Element {
  const { data, error } = useBuyerJson<OrgHypergraph>("org_hypergraph");
  const select = useCallback((s: OrgSelection) => onOpen({ title: s.title, note: s.note, evidence: s.claims }), [onOpen]);
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 12px", padding: "22px 28px 0" }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>UNICEF Supply Division: claims hypergraph</h1>
        <span style={{ color: "#5f6b76", fontSize: 13 }}>Own reports only, no supplier reports</span>
      </div>
      {error ? (
        <p className="empty" role="alert">{error}</p>
      ) : !data ? (
        <p className="empty">Loading claims.</p>
      ) : (
        <main style={{ padding: "14px 28px 22px", maxWidth: 1360 }}>
          <OrgHulls data={data} onSelect={select} />
          <ul style={{ margin: "16px 0 0", paddingLeft: 18, fontSize: 12, color: "#5f6b76" }}>
            {buyer.disclaimers.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </main>
      )}
    </>
  );
}
