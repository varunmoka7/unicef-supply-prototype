import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pytest

import build_climate
import build_map
import build_org_hypergraph
import build_spend
import build_suppliers
import _common
from _common import buyer

SUP = [{"id": "acme", "name": "Acme Vaccines", "alias": r"acme", "boundary_hold": False}]
FIG = {"value": 100, "tier": "annex_stated", "source": "Annex 2 p.1", "added_by": "t"}
REC = {"name": "Acme Ltd", "parent": None, "spend_usd": {"2019": dict(FIG), "2024": dict(FIG), "2025": dict(FIG)}}


def supply_claim(**kw):
    c = {"claim_text": "Acme supplies OPV", "supplier": "Acme Ltd", "claim_category": "tender",
         "source_pdf": "t.pdf", "page": 3, "confidence": 0.9, "product": "OPV", "country": "India",
         "temporal_context": "2024", "source_context_id": "c1"}
    c.update(kw)
    return c


def test_suppliers():
    out = build_suppliers.build([supply_claim()], [], [REC], SUP)
    p = out["profiles"][0]
    assert p["id"] == "acme" and p["unicef_total"] == 1
    assert p["unicef_claims"][0]["tier"] == "claim_extracted" and p["unicef_claims"][0]["page"] == 3
    assert p["spend"]["years"]["2019"]["tier"] == "annex_stated"
    bad = {**REC, "spend_usd": {"2019": {**FIG, "source": ""}}}
    with pytest.raises(ValueError):
        build_suppliers.build([], [], [bad], SUP)
    with pytest.raises(ValueError):
        build_suppliers.build([supply_claim(page=None)], [], [REC], SUP)


def test_spend():
    src = {"records": [REC], "tiers": {}, "categories": {}}
    assert build_spend.build(src)["records"][0]["name"] == "Acme Ltd"
    bad = {**src, "records": [{**REC, "spend_usd": {"2019": {**FIG, "source": None}}}]}
    with pytest.raises(ValueError):
        build_spend.build(bad)


def test_map():
    out = build_map.build([supply_claim()], [REC], SUP)
    spend = [e for e in out["edges"] if e["kind"] == "spend"]
    assert len(spend) == 7 and spend[0]["figure"]["tier"] == "annex_stated"
    prod = next(e for e in out["edges"] if e["kind"] == "product")
    assert prod["to"] == "product:opv" and prod["claims"][0]["pdf"] == "t.pdf"
    assert prod["figure"]["tier"] == "claim_extracted"
    bad = {**REC, "spend_usd": {"2019": {**FIG, "source": ""}}}
    with pytest.raises(ValueError):
        build_map.build([], [bad], SUP)
    with pytest.raises(ValueError):
        build_map.build([supply_claim(page=None)], [REC], SUP)


def test_map_country_spellings_merge():
    claims = [supply_claim(country="NETHERLANDS"), supply_claim(country="Netherlands (the)"),
              supply_claim(country="REPUBLIC OF KOREA"), supply_claim(country="KAZAKHSTAN")]
    out = build_map.build(claims, [REC], SUP)
    countries = {n["id"]: n["label"] for n in out["nodes"] if n["kind"] == "country"}
    assert countries == {"country:netherlands": "Netherlands", "country:republic of korea": "Republic of Korea",
                         "country:kazakhstan": "Kazakhstan"}
    nl = next(e for e in out["edges"] if e["to"] == "country:netherlands")
    assert nl["figure"]["value"] == 2 and len(nl["claims"]) == 2


KEYS = buyer()["climate_concepts"]
VOCAB = {k: {"name": k} for k in KEYS}
ENTS = [{"id": "e1", "metadata": {"company_id": "acme"}}]
HYP = [{"type": "company_context", "entities": ["e1"], "context_ids": ["c1"]},
       {"type": "context_concepts", "metadata": {"context_id": "c1", "company_id": "acme", "concepts": ["scope_1"]}}]


def cclaim(**kw):
    c = {"company_id": "acme", "source_context_id": "c1", "claim_text": "Scope 1 down", "claim_nature": "actual",
         "source_pdf": "r.pdf", "page": 7, "confidence": 0.8}
    c.update(kw)
    return c


def test_climate():
    out = build_climate.build([cclaim()], HYP, ENTS, VOCAB, SUP)
    assert len(out["concepts"]) == 22
    cell = out["cells"][0]
    assert cell["supplier"] == "acme" and cell["concept"] == "scope_1" and cell["contexts"] == 1
    assert cell["items"][0]["pdf"] == "r.pdf" and cell["natures"]["actual"] == 1
    with pytest.raises(ValueError):
        build_climate.build([cclaim(source_pdf=None)], HYP, ENTS, VOCAB, SUP)


def test_bilthoven_entity_spend():
    sups = [{"id": "b", "name": "Bilthoven", "alias": "^Bilthoven", "spend_level": "entity"},
            {"id": "g", "name": "GSK", "alias": "^GlaxoSmithKline|^GSK"}]
    recs = {r["name"]: r for r in _common.annex_records(sups)}
    b = recs["Bilthoven Biologicals BV"]["spend_usd"]["2025"]
    assert b["value"] == 53656096 and "line 1283" in b["source"] and "entity" in b["source"]
    g = next(r for n, r in recs.items() if n.startswith("GlaxoSmithKline") or n.startswith("GSK"))
    assert "parent" in g["spend_usd"]["2025"]["source"]


def test_org_hypergraph_splits_esg_from_operations_by_claim_text():
    vocab = {"ghg_emissions": {"name": "GHG", "group": "climate", "patterns": [r"\bemissions?\b"]},
             "data_protection": {"name": "Data", "group": "policy", "patterns": [r"personal data"]},
             "vaccines": {"name": "Vaccines", "group": "commodity", "patterns": [r"\bvaccines?\b"]}}
    tags = {"c1": {"concepts": ["ghg_emissions", "data_protection", "vaccines"]}}
    esg = [supply_claim(id=f"e{i}", claim_text=f"Vaccine emissions under the GHG Protocol, lot {i}", claim_nature="actual",
                        scope_boundary="scope_3", has_quantitative_data=True, target_year=2030) for i in range(25)]
    ops = [supply_claim(id=f"o{i}", claim_text=f"UNICEF shipped vaccines, lot {i}", claim_category="shipment",
                        claim_nature="actual") for i in range(20)]
    out = build_org_hypergraph.build(esg + ops, tags, vocab)
    # a claim matching an ESG topic is ESG even if it also mentions vaccines; data protection text never matches
    assert [e["id"] for e in out["edges"]] == ["esg:ghg_emissions", "operations:shipment:vaccines"]
    e = out["edges"][0]
    assert e["category"] == "environmental" and e["claims"] == 25 and len(e["items"]) == build_org_hypergraph.CAP
    assert e["members"] == ["unicef_supply", "esg:ghg_emissions", "esg:fw_ghg_protocol", "esg:pdf:t.pdf"]
    assert out["stats"]["esg"]["claims"] == 25 and out["stats"]["operations"]["claims"] == 20
    rows = {b["id"]: {r["label"]: r["claims"] for r in b["rows"]} for b in out["breakdowns"]}
    assert rows["pillar"] == {"Environmental": 25, "Social": 0, "Governance": 0}
    assert rows["scope"] == {"Scope 3": 25, "Scope not stated": 0}
    assert rows["quantified"] == {"With a figure": 25, "Text only": 0} and rows["target_year"] == {"2030": 25}
    assert rows["category"] == {"Shipment": 20}
    assert all(n.get("items") for n in out["nodes"] if n["type"] != "company")


def test_org_hypergraph_climate_claims_join_esg_on_text_alone_but_payees_do_not():
    vocab = {"abatement_costs": {"name": "Abatement", "group": "climate", "patterns": [r"emission factors?"]},
             "sustainable_procurement": {"name": "Sustainable procurement", "group": "policy",
                                         "patterns": [r"sustainab\w*\s*transformation"]}}
    tags = {"c1": {"concepts": ["procurement_spend"]}}  # neither context carries an ESG tag
    climate = supply_claim(id="e38696610a90fa6f-c1", claim_category="climate", claim_nature="method",
                           claim_text="The high-level spend estimate method uses the $ value of major product "
                                      "categories multiplied by industry-level emission factors (kgCO2/$).")
    payee = supply_claim(id="b98a0ec3bcb67146-c19", claim_category="procurement_spend", claim_nature="actual",
                         claim_text="Asia Society for Social Improvement and SustainableTransformation received "
                                    "$85,738 in local procurement for Public Relations and Fundraising.")
    out = build_org_hypergraph.build([climate, payee], tags, vocab)
    assert out["stats"]["esg"]["claims"] == 1 and out["stats"]["operations"]["claims"] == 1
    rows = {b["id"]: {r["label"]: r["claims"] for r in b["rows"]} for b in out["breakdowns"]}
    assert rows["pillar"]["Environmental"] == 1 and rows["pillar"]["Governance"] == 0
    assert rows["category"] == {"Procurement spend": 1}
