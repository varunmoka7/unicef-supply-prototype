import { Link } from "react-router-dom";
import PageHead from "../components/PageHead";
import type { Buyer } from "../lib/buyer";
import "./Index.css";

// Landing page: a directory of the seven routes, grouped as in the top nav.

export default function Index({ buyer }: { buyer: Buyer }): JSX.Element {
  const groups: { name: string; rows: [string, string, string][] }[] = [
    {
      name: "Suppliers",
      rows: [
        ["/suppliers", "Open supplier intelligence", `${buyer.suppliers.length} suppliers: UNICEF spend by year, what their reports claim on climate and ESG, and how they connect to products and countries.`],
        ["/map", "Supply chain map", "UNICEF spend by supplier and year, and the product groups each supplier's claims attach to."],
        ["/climate", "Climate hypergraph", "Which suppliers made claims on which emissions concepts, and what kind of claim each one is."],
        ["/segments", "ESG claims", "Every extracted ESG claim from supplier reports, grouped by concept, supplier or claim nature."],
      ],
    },
    {
      name: "UNICEF Supply Division",
      rows: [
        ["/portfolio", "Division portfolio", "Emissions, procurement and supplier reach, from the Division's own reports."],
        ["/hypergraph", "Open claims hypergraph", "The Division's own reports, no supplier reports. ESG claims and supply operations are shown apart, each grouped by topic, with the claims behind every group."],
      ],
    },
  ];
  return (
    <main className="page">
      <PageHead
        title="What suppliers and UNICEF Supply Division say in their own reports"
        lede="Every claim links to the PDF and page it came from. Figures are prototype data and have not been adjudicated."
      />
      <table className="idx-table">
        <thead>
          <tr><th scope="col">Group</th><th scope="col">Page</th><th scope="col">What is on it</th></tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.name}>
            {g.rows.map(([to, name, text], i) => (
              <tr key={to} className={i === 0 ? "idx-first" : undefined}>
                {i === 0 && <th scope="rowgroup" rowSpan={g.rows.length}>{g.name}</th>}
                <td><Link to={to}>{name}</Link></td>
                <td>{text}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <section className="idx-rules" aria-labelledby="idx-rules">
        <h2 id="idx-rules">How to read every page</h2>
        <ol>
          {buyer.disclaimers.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
