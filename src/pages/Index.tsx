import { Link } from "react-router-dom";
import type { Buyer } from "../lib/buyer";

// Landing page: the two parts of the UNICEF Supply Division prototype, styled like /hypergraph.

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e6e9ee", borderRadius: 10, padding: 22, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 };
const cta: React.CSSProperties = { alignSelf: "flex-start", marginTop: "auto", background: "#17202a", color: "#fff", borderRadius: 8, padding: "8px 16px", fontWeight: 600, textDecoration: "none" };
const eyebrow: React.CSSProperties = { fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "#5f6b76", fontWeight: 600, margin: 0 };

export default function Index({ buyer }: { buyer: Buyer }): JSX.Element {
  return (
    <>
      <header style={{ display: "flex", alignItems: "center", gap: "4px 12px", flexWrap: "wrap", padding: "14px 28px", background: "#fff", borderBottom: "1px solid #e6e9ee" }}>
        <img src="/gct-logo.png" alt="GCT" style={{ width: 28, height: 28 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>GoCarbonTracker (GCT)</span>
        <span style={{ color: "#5f6b76", fontSize: 13 }}>Prototype for UNICEF Supply Division</span>
      </header>
      <main style={{ padding: "36px clamp(16px, 4vw, 28px)", maxWidth: 1080 }}>
        <p style={eyebrow}>UNICEF Supply Division</p>
        <h1 style={{ fontSize: 28, lineHeight: 1.25, margin: "8px 0 10px", maxWidth: 760 }}>What suppliers and UNICEF Supply Division say in their own reports</h1>
        <p style={{ color: "#5f6b76", margin: "0 0 28px", maxWidth: 680 }}>
          Every claim links to the PDF and page it came from. Figures are prototype data and have not been adjudicated.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
          <section style={card} aria-labelledby="idx-suppliers">
            <p style={eyebrow}>Suppliers</p>
            <h2 id="idx-suppliers" style={{ fontSize: 20, margin: 0 }}>Supplier intelligence</h2>
            <p style={{ margin: 0 }}>
              {buyer.suppliers.length} suppliers: UNICEF spend by year, what their reports claim on climate and ESG, and how they connect to products
              and countries.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 8px", display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 13 }}>
              <li><Link style={{ color: "var(--accent)" }} to="/map">Supply chain map</Link></li>
              <li><Link style={{ color: "var(--accent)" }} to="/climate">Climate hypergraph</Link></li>
              <li><Link style={{ color: "var(--accent)" }} to="/segments">ESG claims</Link></li>
            </ul>
            <Link to="/suppliers" style={cta}>Open supplier intelligence</Link>
          </section>

          <section style={card} aria-labelledby="idx-hypergraph">
            <p style={eyebrow}>UNICEF Supply Division</p>
            <h2 id="idx-hypergraph" style={{ fontSize: 20, margin: 0 }}>Claims hypergraph</h2>
            <p style={{ margin: 0 }}>
              UNICEF Supply Division's own reports, no supplier reports. ESG claims and supply operations are shown apart, each grouped by topic,
              with the claims behind every group.
            </p>
            <Link to="/portfolio" style={{ color: "var(--accent)", padding: "10px 0" }}>Division portfolio: emissions, procurement and supplier reach</Link>
            <Link to="/hypergraph" style={cta}>Open claims hypergraph</Link>
          </section>
        </div>

        <ul style={{ margin: "28px 0 0", paddingLeft: 18, fontSize: 12, color: "#5f6b76" }}>
          {buyer.disclaimers.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </main>
    </>
  );
}
