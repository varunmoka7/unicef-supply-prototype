"""Build org_hypergraph.json: a claims hypergraph of UNICEF Supply Division's own reports.

Reads the UNICEF Supply KB only (no supplier reports) and splits every claim into two
groups that are never mixed:
  esg         a claim whose text matches an ESG concept (PILLARS)
  operations  every other claim, grouped by its claim category
A claim joins a concept when its source context carries the concept tag AND the claim
text itself matches one of the concept's vocabulary patterns. Context tags alone are too
broad: one annex table context carries a dozen tags. A climate-category claim may join an
ESG concept on its text alone, since its context is often left untagged; climate claims
matching no ESG vocabulary pattern stay under operations.

ESG: one hull per ESG concept with at least MIN_CLAIMS claims, joining the organisation,
the concept, its top source PDFs and any framework named in at least MIN_FRAMEWORK of its
claims. Operations: one hull per (category, concept) for the TOP_OPS concepts of each
category. Every non-organisation node and every breakdown row carries its own claims.

Run with services/hypergraph-rag/.venv/bin/python3 and PSP_KB_ROOT set from a worktree.
"""
import re
from collections import Counter, defaultdict

from _common import SUPPLY_DIR, load, require_claim, write

ORG = "unicef_supply"
PILLARS = {
    "environmental": ["scope_3_baseline", "scope_1_2", "ghg_emissions", "sbt_targets", "abatement_costs",
                      "supplier_climate_engagement", "environmental_social_standards"],
    "social": ["child_safeguarding", "children_business_principles", "data_protection"],
    "governance": ["anti_fraud", "general_terms", "supplier_due_diligence", "sustainable_procurement"],
}
FRAMEWORKS = {
    "fw_ghg_protocol": ("GHG Protocol", r"GHG Protocol"),
    "fw_sbti": ("SBTi", r"\bSBTi?\b|science.based target"),
    "fw_paris": ("Paris Agreement", r"Paris Agreement|1\.5 ?°?C"),
    "fw_ungc": ("UN Global Compact", r"Global Compact"),
}
SCOPES = {"scope_3": "Scope 3", "scope_1_2": "Scope 1 and 2", "scope_1": "Scope 1", "scope_2": "Scope 2",
          "all_scopes": "All scopes"}
MIN_CLAIMS = 5  # an ESG concept with fewer claims forms no hull
MIN_FRAMEWORK = 3  # claims naming a framework before it joins the hull
PDFS = 2  # source PDFs per ESG hull
TOP_OPS = 3  # concepts per operations category
MIN_OPS = 20  # an operations (category, concept) pair with fewer claims forms no hull
CAP = 25  # claim items shipped per hull, node or row


def _items(cl, where):
    """(claim count, up to CAP distinct claims by extraction confidence), each with pdf and page."""
    seen, items = set(), []
    for c in sorted(cl, key=lambda c: -(c.get("confidence") or 0)):
        if c["claim_text"].lower() in seen:
            continue
        seen.add(c["claim_text"].lower())
        items.append({"text": c["claim_text"], "nature": c["claim_nature"], "pdf": c["source_pdf"],
                      "page": c["page"], "year": c.get("temporal_context"),
                      "needs_review": bool(c.get("needs_review"))})
        if len(items) == CAP:
            break
    for i in items:
        require_claim(i, where)
    return len(cl), items


def _row(label, cl, key=None):
    n, items = _items(cl, label)
    return {"label": label, "key": key, "claims": n, "items": items}


def _nice(s):
    return s.replace("_", " ").capitalize()


def build(claims, tags, vocab):
    pillar_of = {k: p for p, ks in PILLARS.items() for k in ks}
    pats = {k: re.compile("|".join(v["patterns"]), re.I) for k, v in vocab.items()}
    fw = {f: re.compile(p, re.I) for f, (_, p) in FRAMEWORKS.items()}

    concepts_of = {}  # claim id -> concepts its text matches
    for c in claims:
        tagged = set((tags.get(c["source_context_id"]) or {}).get("concepts") or [])
        # a climate claim may join an ESG concept on its text alone; elsewhere (e.g. a procurement payee named
        # "... Society for Social Improvement and Sustainable Transformation") the context tag is still required
        untagged_ok = pillar_of if c["claim_category"] == "climate" else {}
        concepts_of[c["id"]] = [k for k in pats if (k in tagged or k in untagged_ok) and pats[k].search(c["claim_text"])]
    esg = [c for c in claims if any(k in pillar_of for k in concepts_of[c["id"]])]
    esg_ids = {c["id"] for c in esg}
    ops = [c for c in claims if c["id"] not in esg_ids]

    nodes = {ORG: {"id": ORG, "type": "company", "label": "UNICEF Supply Division", "group": None}}
    edges = []

    def node(group, nid, ntype, label, cl):
        key = f"{group}:{nid}"
        if key not in nodes:
            n, items = _items(cl, key)
            nodes[key] = {"id": key, "type": ntype, "label": label, "group": group, "claims": n, "items": items}
        return key

    def pdf_nodes(group, pool, cl, k):
        return [node(group, f"pdf:{p}", "evidence", p.removesuffix(".pdf").replace("_", " "),
                     [c for c in pool if c["source_pdf"] == p])
                for p, _ in Counter(c["source_pdf"] for c in cl).most_common(k)]

    # ESG: one hull per concept
    esg_by = defaultdict(list)
    for c in esg:
        for k in concepts_of[c["id"]]:
            if k in pillar_of:
                esg_by[k].append(c)
    for k, cl in sorted(esg_by.items(), key=lambda kv: (list(PILLARS).index(pillar_of[kv[0]]), -len(kv[1]))):
        if len(cl) < MIN_CLAIMS:
            continue
        t = node("esg", k, "topic", vocab[k]["name"], cl)
        fws = [node("esg", f, "framework", FRAMEWORKS[f][0], [c for c in esg if fw[f].search(c["claim_text"])])
               for f, r in fw.items() if sum(bool(r.search(c["claim_text"])) for c in cl) >= MIN_FRAMEWORK]
        n, items = _items(cl, k)
        edges.append({"id": f"esg:{k}", "group": "esg", "category": pillar_of[k],
                      "title": f"{_nice(pillar_of[k])}: {vocab[k]['name']}",
                      "members": [ORG, t, *fws, *pdf_nodes("esg", esg, cl, PDFS)], "claims": n, "items": items})

    # Operations: one hull per (category, concept)
    ops_by = defaultdict(list)
    for c in ops:
        for k in concepts_of[c["id"]]:
            ops_by[(c["claim_category"], k)].append(c)
    by_cat = defaultdict(list)
    for (cat, k), cl in ops_by.items():
        if len(cl) >= MIN_OPS:
            by_cat[cat].append((len(cl), k))
    for cat in sorted(by_cat, key=lambda c: -sum(n for n, _ in by_cat[c])):
        for _, k in sorted(by_cat[cat], reverse=True)[:TOP_OPS]:
            cl = ops_by[(cat, k)]
            t = node("operations", k, "topic", vocab[k]["name"], [c for c in ops if k in concepts_of[c["id"]]])
            n, items = _items(cl, f"{cat}/{k}")
            edges.append({"id": f"operations:{cat}:{k}", "group": "operations", "category": cat,
                          "title": f"{_nice(cat)}: {vocab[k]['name']}",
                          "members": [ORG, t, *pdf_nodes("operations", ops, cl, 1)], "claims": n, "items": items})

    def esg_pillar(p):
        return [c for c in esg if any(pillar_of.get(k) == p for k in concepts_of[c["id"]])]

    quant = [c for c in esg if c.get("has_quantitative_data")]
    breakdowns = [
        {"group": "esg", "id": "pillar", "title": "By pillar",
         "note": "A claim under topics in two pillars counts in both.",
         "rows": [_row(_nice(p), esg_pillar(p), p) for p in PILLARS]},
        {"group": "esg", "id": "scope", "title": "By emissions scope",
         "rows": [_row(SCOPES.get(s, _nice(s)), [c for c in esg if c.get("scope_boundary") == s])
                  for s, _ in Counter(c.get("scope_boundary") for c in esg if c.get("scope_boundary")).most_common()]
                 + [_row("Scope not stated", [c for c in esg if not c.get("scope_boundary")])]},
        {"group": "esg", "id": "framework", "title": "By framework named",
         "rows": [_row(name, [c for c in esg if fw[f].search(c["claim_text"])]) for f, (name, _) in FRAMEWORKS.items()]},
        {"group": "esg", "id": "quantified", "title": "Quantified",
         "rows": [_row("With a figure", quant), _row("Text only", [c for c in esg if not c.get("has_quantitative_data")])]},
        {"group": "esg", "id": "target_year", "title": "By target year",
         "rows": [_row(str(y), [c for c in esg if c.get("target_year") == y])
                  for y in sorted({c["target_year"] for c in esg if isinstance(c.get("target_year"), int)})]},
        {"group": "operations", "id": "category", "title": "By category",
         "rows": [_row(_nice(cat), [c for c in ops if c["claim_category"] == cat], cat)
                  for cat, _ in Counter(c["claim_category"] for c in ops).most_common()]},
    ]

    def totals(cl):
        return {"claims": len(cl), "contexts": len({c["source_context_id"] for c in cl}),
                "documents": len({c["source_pdf"] for c in cl}),
                "natures": dict(Counter(c["claim_nature"] for c in cl).most_common())}

    return {"nodes": list(nodes.values()), "edges": edges, "breakdowns": breakdowns,
            "stats": {"kb_claims": len(claims), "esg": totals(esg), "operations": totals(ops)}}


def main():
    claims = [c for c in load(SUPPLY_DIR / "claims.corrected.json") if c["company_id"] == ORG]
    out = build(claims, load(SUPPLY_DIR / "concept_tags.json"), load(SUPPLY_DIR / "concept_vocabulary.json"))
    write("org_hypergraph.json", out)
    s = out["stats"]
    print(f"nodes={len(out['nodes'])} edges={len(out['edges'])} kb_claims={s['kb_claims']} "
          f"esg={s['esg']['claims']} operations={s['operations']['claims']}")
    for b in out["breakdowns"]:
        print(b["group"], b["title"], [(r["label"], r["claims"]) for r in b["rows"]])


if __name__ == "__main__":
    main()
