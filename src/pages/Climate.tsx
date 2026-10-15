import { useBuyerJson, type Buyer } from "../lib/buyer";
import type { PanelItem } from "../components/SourcePanel";
import ClimateHypergraph, { type ClimateData } from "./ClimateHypergraph";

export default function Climate({ buyer, onOpen }: { buyer: Buyer; onOpen: (i: PanelItem) => void }): JSX.Element {
  const { data, error } = useBuyerJson<ClimateData>("climate");
  if (error) return <p className="empty" role="alert">{error}</p>;
  if (!data) return <p className="empty">Loading climate data.</p>;
  return (
    <main style={{ padding: 16 }}>
      <ClimateHypergraph
        data={data}
        buyer={buyer}
        onSelect={(s) => onOpen({ title: s.title, note: s.note, evidence: s.claims, scope: s.scope })}
      />
    </main>
  );
}
