import { Link } from "react-router-dom";
import type { Buyer } from "../lib/buyer";

// Landing page: the two parts of the UNICEF Supply Division prototype. Look lives in styles.css (.home-*).

export default function Index({ buyer }: { buyer: Buyer }): JSX.Element {
  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-page cut" aria-hidden="true" />
        <div className="home-copy">
          <h1>What suppliers and UNICEF Supply Division say in their own reports</h1>
          <p>Every claim links to the PDF and page it came from. Figures are prototype data and have not been adjudicated.</p>
        </div>
      </section>

      <div className="home-dest">
        <section className="home-block cut" aria-labelledby="idx-suppliers">
          <h2 id="idx-suppliers">Supplier intelligence</h2>
          <p>
            {buyer.suppliers.length} suppliers: UNICEF spend by year, what their reports claim on climate and ESG, and how they connect to products
            and countries.
          </p>
          <ul>
            <li><Link to="/map">Supply chain map</Link></li>
            <li><Link to="/climate">Climate hypergraph</Link></li>
            <li><Link to="/segments">ESG claims</Link></li>
          </ul>
          <Link to="/suppliers" className="btn cut">Open supplier intelligence</Link>
        </section>

        <section className="home-block home-block-ink cut" aria-labelledby="idx-hypergraph">
          <h2 id="idx-hypergraph">Claims hypergraph</h2>
          <p>
            UNICEF Supply Division's own reports, no supplier reports. ESG claims and supply operations are shown apart, each grouped by topic,
            with the claims behind every group.
          </p>
          <ul>
            <li><Link to="/portfolio">Division portfolio: emissions, procurement and supplier reach</Link></li>
          </ul>
          <Link to="/hypergraph" className="btn on-field cut">Open claims hypergraph</Link>
        </section>
      </div>

      <ul className="home-band">
        {buyer.disclaimers.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </main>
  );
}
