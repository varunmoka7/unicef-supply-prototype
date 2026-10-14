import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const groups: { label: string | null; links: [string, string][] }[] = [
  { label: null, links: [["/", "Overview"]] },
  { label: "UNICEF Supply Division", links: [["/portfolio", "Division portfolio"], ["/hypergraph", "Claims hypergraph"]] },
  { label: "Suppliers", links: [["/suppliers", "Suppliers"], ["/map", "Supply chain map"], ["/climate", "Climate hypergraph"], ["/segments", "ESG claims"]] },
];

export default function Header(): JSX.Element {
  const nav = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // under 760 px the nav is one row that scrolls sideways: centre the current link
  useEffect(() => {
    const n = nav.current;
    const a = n?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (n && a) n.scrollLeft = a.offsetLeft - (n.clientWidth - a.offsetWidth) / 2;
  }, [pathname]);
  return (
    <header className="site-header">
      <div className="site-id">
        <Link to="/" className="site-brand"><img src="/gct-logo.png" alt="GCT" width="28" height="28" />GoCarbonTracker (GCT)</Link>
        <span className="site-sub">Prototype for UNICEF Supply Division</span>
      </div>
      <nav aria-label="Site pages" ref={nav}>
        {groups.map((g) => (
          <ul className="site-group" key={g.label ?? "overview"} aria-label={g.label ?? undefined}>
            {g.links.map(([to, name]) => (
              <li key={to}><NavLink to={to} end>{name}</NavLink></li>
            ))}
          </ul>
        ))}
      </nav>
    </header>
  );
}
