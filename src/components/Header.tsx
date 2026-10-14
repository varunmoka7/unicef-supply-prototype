import { NavLink } from "react-router-dom";
import type { Buyer } from "../lib/buyer";

const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

export default function Header(props: { buyer: Buyer }): JSX.Element {
  const { buyer } = props;
  return (
    <header className="ps-header">
      {buyer.logo ? <img src={buyer.logo} alt="" height={28} /> : <span className="ps-wordmark">{buyer.short_name}</span>}
      <h1>{buyer.name}</h1>
      <nav>
        <NavLink to="/suppliers" className={cls}>Suppliers</NavLink>
        <NavLink to="/map" className={cls}>Supply chain map</NavLink>
        <NavLink to="/climate" className={cls}>Climate hypergraph</NavLink>
        <NavLink to="/segments" className={cls}>ESG claims</NavLink>
      </nav>
      <ul className="ps-disclaimers">
        {buyer.disclaimers.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </header>
  );
}
