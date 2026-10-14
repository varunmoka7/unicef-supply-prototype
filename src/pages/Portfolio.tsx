import { useState } from "react";
import { Link } from "react-router-dom";
import "./Portfolio.css";

const missing = "Not available in saved evidence";
const annual = [
  { year: 2019, spend: 3.826, id: "666e1ad039587117", page: 4 },
  { year: 2020, spend: 4.468, id: "2cfa865061e1e8da", page: 6 },
  { year: 2021, spend: 7.181, id: "0108e21bcadcae67", page: 10 },
  { year: 2022, spend: 7.383, id: "5e8605e75a2158db", page: 9 },
  { year: 2023, spend: 5.244, id: "775b643cedf59cc5", page: 10 },
  { year: 2024, spend: 5.610, id: "9144cb8adc8f3a1d", page: 8 },
  { year: 2025, spend: 5.677, id: "7a57db1cd24071cf", page: 10 },
];
const categories = [
  ["Vaccines", 2729, 71], ["Nutrition", 428, 11], ["Insecticidal nets", 173, 4],
  ["International freight", 90, 2], ["Cash and voucher assistance", 69, 2], ["Others", 379, 10],
] as const;
const ghgCategories = [
  ["3.1", "Purchased goods and services", 3555],
  ["3.4", "Transportation and distribution", 239],
  ["3.6", "Business travel", 4],
  ["", "Other upstream", 1],
  ["3.11", "Use of sold products", 6],
  ["3.12", "End-of-life treatment of sold products", 64],
] as const;
const commodities = [
  ["Vaccines / biologicals", 1656, 2729], ["Cash and voucher assistance", 214, 69],
  ["Nutrition", 181, 428], ["Local technical workforce", 170, 20],
  ["Construction services", 153, 44], ["Pharmaceuticals", 127, 24],
  ["Research and evaluating services", 118, 13], ["Medical supplies and equipment", 113, 28],
  ["Water and sanitation supplies", 99, 17], ["Bednets / insecticides", 94, 173],
  ["International freight", 90, 90], ["Cold chain equipment", 85, 24], ["Other", 727, 211],
] as const;
const indicators = [
  ["Solar systems procured", "1,500 systems", "2024", "Reported procurement", "226de3dd8748ed82", 10],
  ["African syringe procurement volume share", "40%", "2024", "Reported award volume", "226de3dd8748ed82", 10],
  ["Solar purchase-order coverage", "~1,200 sites", "2025", "Orders, not installations", "7c01d299a3d451cd", 18],
  ["Children reached with inclusive supplies", "933,786 children", "2025", "Reported reach", "7c01d299a3d451cd", 18],
  ["African sourcing in safe injection equipment tender", "52%", "2025", "Tender-specific procurement", "09963d41c457bc3a", 38],
  ["Off-grid systems established", "530 systems / 13 countries", "2025 report", "Installation period unstated", "2f4b39cdfe3aaf48", 40],
  ["UNGM notices with sustainability indicators", "236 notices", "2025 report", "Period and denominator unstated", "2f4b39cdfe3aaf48", 40],
] as const;

function Source({ id, children }: { id: string; children: React.ReactNode }) {
  return <a className="pf-source" href={`/portfolio-evidence/${id}.txt`} target="_blank" rel="noreferrer">{children} · saved excerpt</a>;
}

export default function Portfolio() {
  const [year, setYear] = useState(2025);
  const selected = annual.find((row) => row.year === year)!;
  const suppliers = year === 2025 ? "Over 12,000" : year === 2024 ? "12,154" : year === 2023 ? "11,666" : missing;
  const supplierId = year === 2025 ? "eb4fde886f1a7f1d" : year === 2024 ? "4c631ee318c1453c" : "3d30f20ed5e0dbbf";
  return (
    <div className="portfolio">
      <header className="pf-header">
        <Link to="/" className="pf-brand"><img src="/gct-logo.png" alt="GCT" width="28" height="28" />GoCarbonTracker</Link>
        <nav aria-label="UNICEF Supply"><Link to="/portfolio" aria-current="page">Division portfolio</Link><Link to="/hypergraph">Claims hypergraph</Link><Link to="/suppliers">Supplier intelligence</Link></nav>
      </header>
      <main className="pf-main">
        <div className="pf-intro">
          <div><p className="pf-kicker">UNICEF Supply Division / portfolio</p><h1>Supplies for children.<br />The footprint behind them.</h1>
            <p>Supply Division supports the procurement and delivery of essential supplies, from vaccines and nutrition to water, sanitation and emergency equipment. This portfolio brings together its saved supply-chain baseline and the wider UNICEF procurement results.</p>
            <p className="pf-status">Local prototype · reporting boundaries shown with each measure</p>
          </div>
          <div className="pf-baseline"><span>Supply Division · 2019 baseline</span><strong>~3.9 <small>million tCO₂e</small></strong><p>Estimated Scope 3 emissions from international supply within SD operational control.</p><Source id="baseline-p004">Scope 3 baseline report, PDF p. 4</Source></div>
        </div>

        <section className="pf-section" aria-labelledby="pf-emissions">
          <div className="pf-section-head"><div><p className="pf-kicker">Environment / Supply Division boundary</p><h2 id="pf-emissions">Emissions by reporting year</h2></div><p>A historical modeled baseline is available. Annual reductions are not established by these saved sources.</p></div>
          <div className="pf-emissions">
            <div className="pf-table-wrap"><table><caption>SD emissions, tonnes CO₂e</caption><thead><tr><th>Year</th><th>Scope 1</th><th>Scope 2</th><th>Scope 3</th></tr></thead><tbody>{annual.map((row) => <tr key={row.year}><th scope="row">{row.year}</th><td>{missing}</td><td>{missing}</td><td>{row.year === 2019 ? <><b>~3,900,000</b><span>Modeled baseline</span></> : missing}</td></tr>)}</tbody></table><p className="pf-note">The narrative baseline excludes Scope 1 and 2, international business travel, and Scope 3 outside SD control. The compendium includes a business-travel estimate, detailed below. UNICEF-wide operational figures cannot fill the SD cells.</p></div>
            <div className="pf-composition"><h3>What drives the 2019 baseline?</h3><p className="pf-note">Commodity groups · ktCO₂e · report-stated shares</p>{categories.map(([name, value, percent]) => <div className="pf-category" key={name}><div><span>{name}</span><b>{value.toLocaleString("en-US")} <small>({percent}%)</small></b></div><div className="pf-track"><span style={{ width: `${percent}%` }} /></div></div>)}<Source id="baseline-p012">Scope 3 baseline report, PDF p. 12</Source><p className="pf-note">Source table total: 3,869 ktCO₂e. Published category values do not sum exactly to the stated total.</p></div>
          </div>
        </section>

        <section className="pf-section" aria-labelledby="pf-baseline-detail">
          <div className="pf-section-head"><div><p className="pf-kicker">BCG baseline / 2019 Supply Division estimate</p><h2 id="pf-baseline-detail">Scope 3 categories in the model</h2></div><p>These are components of the same historical baseline, not additional emissions or annual updates.</p></div>
          <p className="pf-boundary"><b>US$3.8 billion</b> in 2019 SD baseline spend, as stated in the baseline report. The model includes international procurement, procurement services, and SD-administered cash and voucher assistance. It excludes country-office local procurement and local-partner purchases.</p>
          <div className="pf-baseline-sources"><Source id="d9c7221cd65b95cd">Scope 3 baseline report, PDF p. 11</Source><Source id="98d75c18bb0d0c5e">Assessment boundary, PDF p. 10</Source></div>
          <dl className="pf-ghg-categories">{ghgCategories.map(([code, label, value]) => <div key={label}><dt>{code ? `Category ${code}` : "Grouped source label"}<span>{label}</span></dt><dd>{value.toLocaleString("en-US")} <small>ktCO₂e</small></dd></div>)}</dl>
          <p className="pf-note">The six compendium components sum to 3,869 ktCO₂e. The narrative table lists three components totaling 3,858 ktCO₂e, alongside a stated total of 3,869 ktCO₂e. The compendium includes an additional 11 ktCO₂e in business travel, other upstream activities and product use.</p>
          <Source id="c6433ca5e24f045b">BCG compendium, PDF p. 21</Source>
          <p className="pf-source-caveat">Source difference: the narrative report excludes international business travel, while the compendium includes 4 ktCO₂e of SD business travel and assumes travel-agency data captured 80% of SD travel. These source descriptions are retained separately.</p>
          <details className="pf-explainer"><summary>Why are Supply Division Scope 1 and Scope 2 missing?</summary><p>The SD baseline estimates supply-chain Scope 3. It excludes Scope 1 and Scope 2. The same report cites a combined UNICEF-wide Scope 1 and 2 figure of 0.03 MtCO₂e for 2019, without a division allocation or a separate value for each scope. That figure cannot establish SD Scope 1 or SD Scope 2. Later annual SD emissions remain absent from the saved evidence used on this page.</p><div className="pf-operational-context"><b>UNICEF-wide operational context · 2019</b><span>Scope 1 + Scope 2 combined: <strong>0.03 MtCO₂e</strong></span><span>No separate scope split or SD allocation is provided.</span></div><Source id="baseline-p004">Scope 3 baseline report, PDF p. 4</Source></details>
          <div className="pf-table-wrap pf-commodity-table"><table><caption>All 13 commodity rows in the BCG compendium · 2019 SD baseline</caption><thead><tr><th>Commodity</th><th>Reported spend<br />US$ million</th><th>Estimated emissions<br />ktCO₂e</th></tr></thead><tbody>{commodities.map(([label, spend, emissions]) => <tr key={label}><th scope="row">{label}</th><td>{spend.toLocaleString("en-US")}</td><td>{emissions.toLocaleString("en-US")}</td></tr>)}</tbody></table><p className="pf-note">Source-stated row values sum to US$3,827 million and 3,870 ktCO₂e. The headline baseline remains approximately US$3.8 billion and the activity-category total remains 3,869 ktCO₂e. No row is rescaled. Commodity groupings differ from the narrative summary above.</p><Source id="7b4a11e7593089f1">BCG compendium, PDF p. 24</Source></div>
          <details className="pf-explainer"><summary>Supplier concentration and engagement in the baseline report</summary><p>The 30 highest-emitting suppliers in 2019 account for 80 to 90% of SD Scope 3 emissions. The report describes 12 with science-based targets in place and 18 without targets, with the latter group driving the next 25 to 40% of Scope 3 emissions. These are historical baseline-report statements, not current supplier assessments or the total supplier count.</p><div className="pf-baseline-sources"><Source id="d26f3b5a500760ef">Baseline supplier engagement, PDF p. 15</Source><Source id="6b1fd37e7dd9e0e4">Baseline supplier engagement, PDF p. 16</Source></div></details>
        </section>

        <section className="pf-section" aria-labelledby="pf-procurement">
          <div className="pf-section-head"><div><p className="pf-kicker">Scale / global UNICEF context</p><h2 id="pf-procurement">Procurement and supplier reach</h2></div><label className="pf-year">Reporting year<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{annual.map((row) => <option key={row.year}>{row.year}</option>)}</select></label></div>
          <p className="pf-boundary">These annual report figures cover global UNICEF supply and logistics procurement. A Supply Division-only annual spend series or supplier total is not available in the saved evidence used here. The separate SD baseline above uses rounded 2019 model spend.</p>
          <div className="pf-procurement-grid"><div><div className="pf-numbers"><div><span>Procurement value · {year}</span><strong>US${selected.spend.toFixed(3)}bn</strong><Source id={selected.id}>Annual report {year}, PDF p. {selected.page}</Source></div><div><span>UNICEF supplier base · {year}</span><strong className={suppliers === missing ? "pf-gap" : undefined}>{suppliers}</strong>{suppliers !== missing && <Source id={supplierId}>Annual report {year}, PDF p. {year === 2025 ? 5 : year === 2024 ? 12 : 14}</Source>}</div></div>
            <p className="pf-note">Procurement values are nominal US dollars, not cash disbursements. Annual report values below come from saved extracted contexts; the original PDFs were not re-opened for this prototype.</p>
            <div className="pf-spend" aria-label="Global UNICEF procurement value by year, US dollars billion">{annual.map((row) => <button key={row.year} aria-pressed={year === row.year} onClick={() => setYear(row.year)} aria-label={`${row.year}: US$${row.spend.toFixed(3)} billion`}><span className="pf-bar-space"><span className="pf-bar" style={{ height: `${row.spend / 7.383 * 100}%` }} /></span><b>{row.spend.toFixed(3)}</b><span>{row.year}</span></button>)}</div>
          </div><div className="pf-reach"><h3>Social and procurement indicators</h3><p className="pf-note">Global UNICEF · 2024 · saved annual report context</p><dl><div><dt>Countries supplied</dt><dd>160</dd></div><div><dt>Procurement from suppliers registered in programme countries</dt><dd>57.2%<small>US$3.21 billion of goods and services</small></dd></div><div><dt>Supplies procured with UN agencies and other partners</dt><dd>79%</dd></div></dl><Source id="9144cb8adc8f3a1d">Annual report 2024, PDF p. 8</Source><p className="pf-note">Supplier location does not establish local manufacture or an environmental outcome.</p></div></div>
        </section>

        <section className="pf-section" aria-labelledby="pf-esg"><div className="pf-section-head"><div><p className="pf-kicker">Reported supply results / environment and social access</p><h2 id="pf-esg">Additional ESG measures</h2></div><p>UNICEF supply-function disclosures. These measure procurement, coverage or reach; they do not establish SD operational emissions reductions.</p></div>
          <div className="pf-indicators">{indicators.map(([label, value, period, status, id, page]) => <article key={label}><div><h3>{label}</h3><span>{period} · {status}</span></div><strong>{value}</strong><Source id={id}>Annual report {id === "226de3dd8748ed82" ? 2024 : 2025}, PDF p. {page}</Source></article>)}</div>
          <details className="pf-explainer"><summary>Expected outcomes and potential reductions</summary><p><b>450 facilities expected by mid-2025.</b> The 2024 report describes expected solarization coverage, not confirmed completion.</p><Source id="226de3dd8748ed82">Annual report 2024, PDF p. 10</Source><p><b>Up to 70% potential carbon reduction.</b> The 2025 report describes soybeans and chickpeas as possible alternative RUTF ingredients. This is formulation potential, not a realized SD footprint reduction or an annual inventory result.</p><Source id="ff46f22b2a6051ef">Annual report 2025, PDF p. 39</Source></details>
        </section>

        <section className="pf-footer" aria-labelledby="pf-coverage"><div><h2 id="pf-coverage">Read the evidence behind the portfolio</h2><p>The baseline pages and annual report excerpts are saved locally. Missing figures stay visible. This page does not estimate SD spend, infer annual emissions, or combine supplier footprints.</p></div><div><Link to="/hypergraph">Open Supply Division claims</Link><Link to="/suppliers">Open supplier reports and spend</Link><p className="pf-note">The supplier intelligence page covers 15 selected vaccine suppliers, not the full UNICEF supplier base.</p></div></section>
      </main>
    </div>
  );
}
