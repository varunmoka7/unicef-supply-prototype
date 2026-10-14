"""Build data/suppliers.json: one profile per vaccine supplier, joining the Supply KB (UNICEF's
documents), the vaccine-suppliers KB (the supplier's own reports) and Annex 2 spend.

Port of the prototype's build_profiles.py with aliases read from buyer.json. Each UNICEF-side
claim keeps the supplier string it matched on. Nothing is calculated across suppliers.
"""
import re
from collections import Counter

from _common import annex_records, SUPPLY_DIR, VACCINE_DIR, buyer, load, require_claim, require_figure, write

CLIMATE = re.compile(r"scope\s*[123]|tCO2|CO2e|greenhouse|emission|net.?zero|science.based|SBTi", re.I)
SAMPLE_ORDER = ["actual", "target", "commitment", "projection"]
UNICEF_CATEGORIES = ["tender", "procurement_spend", "climate", "policy_requirement", "market", "shipment", "product_quality"]
UNICEF_CAP, OWN_CAP = 12, 10
SPEND_YEARS = ["2019", "2024", "2025"]
ADDED_BY = "build_suppliers.py"


def _claim(c, extra):
    d = {"text": c["claim_text"], "pdf": c["source_pdf"], "page": c["page"], "year": c.get("temporal_context"),
         "tier": "claim_extracted", "added_by": ADDED_BY}
    d.update(extra)
    require_claim(d, c.get("source_context_id", "claim"))
    return d


def build(supply, vaccine, records, suppliers):
    profiles = []
    for s in suppliers:
        rx = re.compile(s["alias"], re.I)

        mine = [c for c in supply if c.get("supplier") and rx.search(c["supplier"].strip())]
        cats = Counter(c.get("claim_category") for c in mine)
        seen, unicef = set(), []
        for cat in UNICEF_CATEGORIES:
            for c in sorted((c for c in mine if c.get("claim_category") == cat), key=lambda c: -(c.get("confidence") or 0)):
                k = c["claim_text"].strip().lower()
                if k in seen:
                    continue
                seen.add(k)
                unicef.append((c, cat))

        seen2, own = set(), []
        for c in vaccine:
            if c["company_id"] != s["id"] or not CLIMATE.search(c["claim_text"]):
                continue
            k = c["claim_text"].strip().lower()
            if k not in seen2:
                seen2.add(k)
                own.append(c)
        own.sort(key=lambda c: -c["confidence"])
        # A mixed sample (up to 3 per nature, then fill by confidence); the mix itself is own_by_nature.
        sample = [c for n in SAMPLE_ORDER for c in [x for x in own if x["claim_nature"] == n][:3]]
        sample += [c for c in own if c not in sample][: OWN_CAP - len(sample)]

        rec = next((r for r in records if rx.search(r["name"]) or (r.get("parent") and rx.search(r["parent"]))), None)
        spend = None
        if rec:
            years = {}
            for y in SPEND_YEARS:
                fig = dict((rec.get("spend_usd") or {}).get(y) or {})
                if not fig:
                    fig = {"value": None, "tier": "gap", "source": f"Annex 2 record '{rec['name']}' has no {y} entry",
                           "added_by": ADDED_BY, "note": "not in the annex"}
                fig["unit"] = "USD"
                require_figure(fig, f"{s['name']} {y}")
                years[y] = fig
            spend = {"record": rec["name"], "parent": rec.get("parent"), "years": years}

        profiles.append({
            "id": s["id"], "name": s["name"], "boundary_hold": s["boundary_hold"], "spend": spend,
            "unicef_total": len(unicef), "unicef_by_category": dict(cats),
            "unicef_claims": [_claim(c, {"category": cat, "matched_supplier": c["supplier"]}) for c, cat in unicef[: UNICEF_CAP * 2]],
            "own_total": len(own),
            "own_by_nature": dict(Counter(c["claim_nature"] for c in own)),
            "own_claims": [_claim(c, {"nature": c["claim_nature"], "needs_review": bool(c.get("needs_review"))}) for c in sample[:OWN_CAP]],
        })
    profiles.sort(key=lambda p: -(p["unicef_total"] + p["own_total"]))
    return {"profiles": profiles}


def main():
    out = build(load(SUPPLY_DIR / "claims.corrected.json"), load(VACCINE_DIR / "claims.corrected.json"),
                annex_records(buyer()["suppliers"]), buyer()["suppliers"])
    write("suppliers.json", out)
    for p in out["profiles"]:
        print(f"{p['name']:26} unicef_claims={p['unicef_total']:4} own_emissions_claims={p['own_total']:4} spend={'yes' if p['spend'] else 'no'}")


if __name__ == "__main__":
    main()
