import { useCallback, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import SourcePanel, { type PanelItem } from "./components/SourcePanel";
import Suppliers from "./pages/Suppliers";
import SupplyChainMap from "./pages/SupplyChainMap";
import Climate from "./pages/Climate";
import Hypergraph from "./pages/Hypergraph";
import EsgSegments from "./pages/EsgSegments";
import Index from "./pages/Index";
import Portfolio from "./pages/Portfolio";
import { useBuyerJson, type Buyer } from "./lib/buyer";

export default function App() {
  const [item, setItem] = useState<PanelItem | null>(null);
  const { data: buyer, error } = useBuyerJson<Buyer>("buyer");
  const close = useCallback(() => setItem(null), []);
  if (error) return <p className="empty" role="alert">{error}</p>;
  if (!buyer) return <p className="empty">Loading buyer data.</p>;
  return (
    <>
      {/* the source panel is fixed on the right; reserve its width so it never covers the page */}
      <div className={item ? "with-panel" : undefined}>
        <Routes>
          <Route path="/" element={<Index buyer={buyer} />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/suppliers" element={<Suppliers buyer={buyer} onOpen={setItem} />} />
          <Route path="/hypergraph" element={<Hypergraph buyer={buyer} onOpen={setItem} />} />
          <Route
            path="*"
            element={
              <>
                <Header buyer={buyer} />
                <Routes>
                  <Route path="/map" element={<SupplyChainMap buyer={buyer} onOpen={setItem} />} />
                  <Route path="/climate" element={<Climate buyer={buyer} onOpen={setItem} />} />
                  <Route path="/segments" element={<EsgSegments onOpen={setItem} />} />
                  <Route path="*" element={<Navigate to="/suppliers" replace />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </div>
      <SourcePanel item={item} tiers={buyer.tiers} onClose={close} />
    </>
  );
}
