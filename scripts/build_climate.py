"""Build climate.json: which of the 22 climate concepts each UNICEF vaccine supplier discusses.

A context sits in cell (supplier, concept) when a context_concepts hyperedge carries the
concept and a company_context hyperedge puts the same context under that supplier. Cells
count distinct contexts and the claims extracted from them; nothing is summed across cells.
Cells with zero contexts are not written.

Run with services/hypergraph-rag/.venv/bin/python3 and PSP_KB_ROOT set from a worktree.
"""
from collections import defaultdict

from _common import VACCINE_DIR, buyer, load, require_claim, write

NATURES = ("target", "commitment", "actual", "projection")
CAP = 25


def _group(key):
    return "framework" if key.startswith("framework_") else "metric" if key.startswith("metric_") else "scope"


def climate_keys(vocab):
    keys = buyer()["climate_concepts"]
    assert len(keys) == 22, f"expected 22 climate concepts, got {len(keys)}"
    missing = [k for k in keys if k not in vocab]
    assert not missing, f"concepts missing from vocabulary: {missing}"
    return keys


def build(claims, hyperedges, entities, vocab, suppliers):
    """Return {"suppliers", "concepts", "cells", "disagreements"} from already-loaded inputs."""
    keys = climate_keys(vocab)
    wanted = set(keys)
    ids = {s["id"] for s in suppliers}
    ent_company = {e["id"]: e["metadata"]["company_id"] for e in entities if e.get("metadata", {}).get("company_id")}

    ctx_company = defaultdict(set)  # context_id -> supplier ids
    for h in hyperedges:
        if h.get("type") != "company_context":
            continue
        for eid in h["entities"]:
            cid = ent_company.get(eid)
            if cid in ids:
                for ctx in h["context_ids"]:
                    ctx_company[ctx].add(cid)

    cell_ctx = defaultdict(set)  # (supplier, concept) -> context ids
    disagreements = 0
    for h in hyperedges:
        if h.get("type") != "context_concepts":
            continue
        m = h["metadata"]
        hit = wanted.intersection(m["concepts"])
        owners = ctx_company.get(m["context_id"])
        if not hit or not owners:
            continue
        if m["company_id"] not in owners:
            disagreements += 1
            continue
        for c in hit:
            cell_ctx[(m["company_id"], c)].add(m["context_id"])

    by_ctx = defaultdict(list)  # (supplier, context_id) -> claims
    for cl in claims:
        if cl["company_id"] in ids:
            by_ctx[(cl["company_id"], cl["source_context_id"])].append(cl)

    cells = []
    for (sup, con), ctxs in sorted(cell_ctx.items()):
        cl = [c for ctx in sorted(ctxs) for c in by_ctx.get((sup, ctx), [])]
        cl.sort(key=lambda c: (NATURES.index(c["claim_nature"]) if c["claim_nature"] in NATURES else len(NATURES),
                               -(c.get("confidence") or 0)))
        seen, items = set(), []
        for c in cl:
            k = c["claim_text"].lower()
            if k in seen:
                continue
            seen.add(k)
            items.append({"text": c["claim_text"], "nature": c["claim_nature"], "pdf": c["source_pdf"],
                          "page": c["page"], "year": c.get("temporal_context"),
                          "needs_review": bool(c.get("needs_review"))})
        for i in items:
            require_claim(i, f"{sup}/{con}")
        cells.append({"supplier": sup, "concept": con, "contexts": len(ctxs), "claims": len(cl),
                      "natures": {n: sum(c["claim_nature"] == n for c in cl) for n in NATURES},
                      "items": items[:CAP]})

    return {"suppliers": [{"id": s["id"], "name": s["name"], "boundary_hold": s["boundary_hold"]} for s in suppliers],
            "concepts": [{"id": k, "label": vocab[k]["name"], "group": _group(k)} for k in keys],
            "cells": cells, "disagreements": disagreements}


def main():
    sup = buyer()["suppliers"]
    out = build(load(VACCINE_DIR / "claims.corrected.json"), load(VACCINE_DIR / "hyperedges.json"),
                load(VACCINE_DIR / "entities.json"), load(VACCINE_DIR / "concept_vocabulary.json"), sup)
    dis = out.pop("disagreements")
    write("climate.json", out)
    have = {c["supplier"] for c in out["cells"]}
    print(f"cells={len(out['cells'])} contexts_total={sum(c['contexts'] for c in out['cells'])} "
          f"suppliers_with_cells={len(have)}/{len(sup)} disagreements={dis}")
    for s in sup:
        if s["id"] not in have:
            print("zero cells:", s["id"])


if __name__ == "__main__":
    main()
