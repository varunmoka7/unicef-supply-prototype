import { useCallback } from "react";
import { useBuyerJson, type Buyer } from "../lib/buyer";
import type { PanelItem } from "../components/SourcePanel";
import PageHead from "../components/PageHead";
import "./Hypergraph.css";
import OrgHulls, { type OrgHypergraph, type OrgSelection } from "./OrgHulls";

// UNICEF Supply Division's own reports only, no supplier reports.
export default function Hypergraph({ buyer, onOpen }: { buyer: Buyer; onOpen: (i: PanelItem) => void }): JSX.Element {
  const { data, error } = useBuyerJson<OrgHypergraph>("org_hypergraph");
  const select = useCallback((s: OrgSelection) => onOpen({ title: s.title, note: s.note, evidence: s.claims }), [onOpen]);
  return (
    <main className="page">
      <PageHead title="UNICEF Supply Division: claims" lede="Own reports only, no supplier reports." rules={buyer.disclaimers} />
      {error ? (
        <p className="empty" role="alert">{error}</p>
      ) : !data ? (
        <p className="empty">Loading claims.</p>
      ) : (
        <OrgHulls data={data} onSelect={select} />
      )}
    </main>
  );
}
