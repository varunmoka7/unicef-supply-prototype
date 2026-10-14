import { Link, NavLink } from "react-router-dom";

const groups: { label: string | null; links: [string, string][] }[] = [
  { label: null, links: [["/", "Overview"]] },
  { label: "UNICEF Supply Division", links: [["/portfolio", "Division portfolio"], ["/hypergraph", "Claims hypergraph"]] },
  { label: "Suppliers", links: [["/suppliers", "Suppliers"], ["/map", "Supply chain map"], ["/climate", "Climate hypergraph"], ["/segments", "ESG claims"]] },
];

export default function Header(): JSX.Element {
  return (
    <header className="site-header">
      <div className="site-id">
        <Link to="/" className="site-brand"><img src="/gct-logo.png" alt="GCT" width="28" height="28" />GoCarbonTracker (GCT)</Link>
        <span className="site-sub">Prototype for UNICEF Supply Division</span>
      </div>
      <nav aria-label="Site pages">
        {groups.map((g) => (
          <div className="site-group" key={g.label ?? "overview"} role={g.label ? "group" : undefined} aria-label={g.label ?? undefined}>
            {g.label && <span className="site-group-label" aria-hidden="true">{g.label}</span>}
            {g.links.map(([to, name]) => (
              <NavLink key={to} to={to} end>{name}</NavLink>
            ))}
          </div>
        ))}
      </nav>
    </header>
  );
}
