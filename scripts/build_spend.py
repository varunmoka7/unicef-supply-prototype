"""Build data/spend.json: the Annex 2 records with the figure schema unchanged, plus the tier
and category tables from the source file. Records come from the prototype's unicef_supplier_kb.json
(not rewritten there); each buyer.json supplier's spend_usd is replaced by the parent totals in
suppliers-by-year.csv, and a supplier with no prototype record gets a new one.
"""
from _common import ANNEX, annex_records, buyer, load, require_figure, write


def merge_csv(records, csv_records):
    out = list(records)
    for c in csv_records:
        i = next((i for i, r in enumerate(out) if r.get("parent") == c["parent"]), None)
        if i is None:
            out.append(c)
        else:
            out[i] = {**out[i], "spend_usd": c["spend_usd"]}
    return out


def build(src):
    src = {**src, "records": merge_csv(src["records"], annex_records(buyer()["suppliers"]))}
    for r in src["records"]:
        for field in ("bcg_status", "sbt_status"):
            if r.get(field):
                require_figure(r[field], f"{r['name']} {field}")
        for y, fig in (r.get("spend_usd") or {}).items():
            require_figure(fig, f"{r['name']} {y}")
    return {"records": src["records"], "tiers": src["tiers"], "categories": src["categories"]}


def main():
    out = build(load(ANNEX))
    write("spend.json", out)
    print(f"records={len(out['records'])} tiers={len(out['tiers'])} categories={len(out['categories'])}")


if __name__ == "__main__":
    main()
