"""Build data/map.json: UNICEF -> supplier spend edges by year, supplier -> product and country edges.

Spend comes from the Annex 2 records (first record whose name or parent matches the supplier
alias, as in the prototype build_profiles.py). Product and country edges come from Supply KB
claims whose supplier string matches the alias; a claim without pdf or page is refused.
A missing spend year is a gap figure, never 0.

Run: PSP_KB_ROOT=<checkout with the KBs> services/hypergraph-rag/.venv/bin/python3 apps/public-sector/scripts/build_map.py
"""
import re
from collections import Counter

from _common import annex_records, SUPPLY_DIR, YEARS, buyer, load, require_claim, require_figure, write

BY = "build_map.py"
CLAIM_CAP = 20


def gap(why):
    return {"value": None, "unit": "USD", "tier": "gap", "source": why, "added_by": BY, "note": "not in the annex"}


def spend_figure(rec, alias, year):
    if rec is None:
        return gap(f"Annex 2: no row matches alias {alias}")
    fig = (rec.get("spend_usd") or {}).get(year)
    if not fig or fig.get("value") is None:
        return gap(f"Annex 2: no entry for {year}")
    return {**fig, "unit": "USD"}


def claim_figure(n):
    return {"value": n, "unit": "claims", "tier": "claim_extracted", "added_by": BY,
            "source": "UNICEF Supply KB claims.corrected.json (final-v1-build2), supplier-matched claims",
            "note": "model-extracted, not source-checked"}


def country_name(v):
    """One spelling per country: drop a trailing '(the)', title-case ALL-CAPS names.
    'NETHERLANDS' and 'Netherlands (the)' both become 'Netherlands'."""
    v = re.sub(r"\s*\(the\)\s*$", "", v, flags=re.I).strip()
    if v.isupper():
        v = " ".join(w if w in ("of", "and", "the") else w.capitalize() for w in v.lower().split())
    return v


def build(supply, records, buyer_suppliers):
    nodes = [{"id": "unicef", "kind": "buyer", "label": "UNICEF"}]
    edges = []
    used = {}  # product/country nodes, only those with an edge
    for s in buyer_suppliers:
        sid, alias = s["id"], s["alias"]
        rx = re.compile(alias, re.I)
        nodes.append({"id": sid, "kind": "supplier", "label": s["name"]})

        rec = next((r for r in records if r.get("spend_usd") is not None
                    and (rx.search(r["name"]) or (r.get("parent") and rx.search(r["parent"])))), None)
        for y in YEARS:
            fig = spend_figure(rec, alias, y)
            require_figure(fig, f"{sid} spend {y}")
            edges.append({"from": "unicef", "to": sid, "kind": "spend", "year": y, "figure": fig})

        mine = [c for c in supply
                if c.get("supplier") and rx.search(c["supplier"].strip())]
        mine.sort(key=lambda c: -(c.get("confidence") or 0))
        for kind in ("product", "country"):
            groups, labels = {}, {}
            for c in mine:
                v = (c.get(kind) or "").strip()
                if not v:
                    continue
                if kind == "country":
                    v = country_name(v)
                require_claim({"pdf": c.get("source_pdf"), "page": c.get("page")}, f"{sid} {kind} {v}")
                k = v.lower()
                labels.setdefault(k, v)
                groups.setdefault(k, []).append(c)
            for k, cs in groups.items():
                nid = f"{kind}:{k}"
                used[nid] = {"id": nid, "kind": kind, "label": labels[k]}
                items = [{"text": c["claim_text"], "pdf": c["source_pdf"], "page": c["page"],
                          "year": c.get("temporal_context")} for c in cs[:CLAIM_CAP]]
                for i in items:
                    require_claim(i, f"{sid} {nid}")
                fig = claim_figure(len(cs))
                require_figure(fig, f"{sid} {nid}")
                edges.append({"from": sid, "to": nid, "kind": kind, "figure": fig, "claims": items})
    return {"nodes": nodes + list(used.values()), "edges": edges}


def main():
    suppliers = buyer()["suppliers"]
    out = build(load(SUPPLY_DIR / "claims.corrected.json"), annex_records(suppliers), suppliers)
    write("map.json", out)
    kinds = Counter(e["kind"] for e in out["edges"])
    gaps = sum(1 for e in out["edges"] if e["kind"] == "spend" and e["figure"]["tier"] == "gap")
    print(f"map.json: {len(out['nodes'])} nodes, edges {dict(kinds)}, {gaps} gap spend edges")
    for s in suppliers:
        if not any(e["from"] == s["id"] and e["kind"] != "spend" for e in out["edges"]):
            print(f"alias matched zero Supply KB claims: {s['id']} ({s['alias']})")


if __name__ == "__main__":
    main()
