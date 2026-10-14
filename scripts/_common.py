"""Shared paths and the refusal checks for the public-sector builders.

Run from anywhere with services/hypergraph-rag/.venv/bin/python3. The two UNICEF KBs are
untracked, so set PSP_KB_ROOT to the checkout that holds them when running from a worktree.
"""
import csv
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KB_ROOT = Path(os.environ.get("PSP_KB_ROOT", ROOT))
BUYER_DIR = ROOT / "apps/public-sector/buyers/unicef"
DATA_DIR = BUYER_DIR / "data"
ANNEX = ROOT / "_bmad-output/planning-artifacts/super-epics/SUPER-EPIC-010-job-applications/epics/unicef-sdm/prototype/unicef_supplier_kb.json"
ANNEX_CSV = ROOT / "_bmad-output/planning-artifacts/super-epics/SUPER-EPIC-010-job-applications/epics/unicef-sdm/research/annex2/suppliers-by-year.csv"
_KBS = KB_ROOT / "services/hypergraph-rag/core/knowledge-base/public_sector"
SUPPLY_DIR = _KBS / "unicef-supply-kb-v1/completion-2026-10-12/final-v1-build2"
VACCINE_DIR = _KBS / "unicef-vaccine-suppliers-kb-v1/completion-2026-10-12/final-v1-build2"

YEARS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025"]
FIGURE_KEYS = ("source", "tier", "added_by")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write(name, obj):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_DIR / name, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


def buyer():
    return load(BUYER_DIR / "buyer.json")


def alias_table():
    """vaccine-KB company id -> compiled alias regex, from buyer.json."""
    return {s["id"]: re.compile(s["alias"], re.I) for s in buyer()["suppliers"]}


def require_figure(fig, where):
    """A figure carries source, tier, added_by; a gap never carries a number and a non-gap always has a value."""
    missing = [k for k in FIGURE_KEYS if not fig.get(k)]
    if missing:
        raise ValueError(f"{where}: figure missing {missing}")
    if fig["tier"] == "gap" and isinstance(fig.get("value"), (int, float)):
        raise ValueError(f"{where}: gap figure carries a number")
    if fig["tier"] != "gap" and fig.get("value") is None:
        raise ValueError(f"{where}: non-gap figure has no value")


def require_claim(item, where):
    if not item.get("pdf") or item.get("page") is None:
        raise ValueError(f"{where}: claim item missing pdf or page")


def annex_records(suppliers):
    """One Annex 2 record per supplier from suppliers-by-year.csv, in the prototype record shape.

    The record is named for the first entity row that matches the alias; its figures are the parent
    row's totals, so a supplier's other entities and Annex 2 merges are included. A supplier with
    "spend_level": "entity" takes the matched entity row's own figures instead. Empty cells are gap
    figures, never 0. No match returns no record.
    """
    with open(ANNEX_CSV, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = [(reader.line_num, r) for r in reader]
    cols = {y: header.index(y) for y in YEARS}
    parents = {r[1]: (ln, r) for ln, r in rows if r[0] == "parent"}
    out = []
    for s in suppliers:
        rx = re.compile(s["alias"], re.I)
        eln, ent = next(((n, r) for n, r in rows if r[0] == "entity" and (rx.search(r[1]) or rx.search(r[2]))),
                        (None, None))
        if not ent or ent[2] not in parents:
            continue
        ln, prow = parents[ent[2]]
        if s.get("spend_level") == "entity":
            ln, prow, label = eln, ent, f"entity '{ent[1]}'"
        else:
            label = f"parent '{prow[1]}' total"
        spend = {}
        for y in YEARS:
            where = f"{ANNEX_CSV.name} line {ln} ({label}, column {y})"
            v = prow[cols[y]].strip()
            if v:
                fig = {"value": int(float(v)), "source": f"research/annex2/{where}", "tier": "reported",
                       "added_by": "build_spend.py from suppliers-by-year.csv"}
                if y in ("2021", "2022", "2023"):
                    fig["flag"] = "incomplete year: the 2021-2023 Annex 2 lists no vaccine makers' main entities"
            else:
                fig = {"value": None, "source": f"research/annex2/{where}: empty cell", "tier": "gap",
                       "added_by": "build_spend.py from suppliers-by-year.csv",
                       "flag": "not in the annex"}
            spend[y] = fig
        out.append({"name": ent[1], "parent": prow[1], "category": "vaccines", "spend_usd": spend})
    return out
