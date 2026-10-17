import { useCallback, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import PageHead from "./components/PageHead";
import SourcePanel, { type PanelItem } from "./components/SourcePanel";
import Suppliers from "./pages/Suppliers";
import SupplyChainMap from "./pages/SupplyChainMap";
import Climate from "./pages/Climate";
import Hypergraph from "./pages/Hypergraph";
import EsgSegments from "./pages/EsgSegments";
import Index from "./pages/Index";
import Portfolio from "./pages/Portfolio";
import { useBuyerJson, type Buyer } from "./lib/buyer";

const HEADS: Record<string, { title: string; lede: string }> = {
  "/map": { title: "Supply chain map", lede: "UNICEF spend by supplier and year, and the product groups each supplier's claims attach to." },
  "/climate": { title: "Supplier climate claims", lede: "Which suppliers made claims on which emissions concepts, and what kind of claim each one is." },
  "/segments": { title: "ESG claims by concept", lede: "Every extracted ESG claim from supplier reports, grouped by concept, supplier or claim nature." },
};

export default function App() {
  const { pathname } = useLocation();
  const [item, setItem] = useState<PanelItem | null>(null);
  const { data: buyer, error } = useBuyerJson<Buyer>("buyer");
  const close = useCallback(() => setItem(null), []);
  const head = HEADS[pathname] ?? HEADS["/map"];
  if (error) return <p className="empty" role="alert">{error}</p>;
  if (!buyer) return <p className="empty">Loading buyer data.</p>;
  return (
    <>
      {/* the source panel is fixed on the right; reserve its width so it never covers the page */}
      <div className={item ? "with-panel" : undefined}>
        <Header />
        <Routes>
          <Route path="/" element={<Index buyer={buyer} />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/suppliers" element={<Suppliers buyer={buyer} onOpen={setItem} />} />
          <Route path="/hypergraph" element={<Hypergraph buyer={buyer} onOpen={setItem} />} />
          <Route
            path="*"
            element={
              <>
                <PageHead title={head.title} lede={head.lede} rules={buyer.disclaimers} />
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
      <SourcePanel item={item} tiers={buyer.tiers} onClose={close} supplierCounts={pathname === "/suppliers"} />
    </>
  );
}
