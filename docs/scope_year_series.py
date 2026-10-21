"""Scope 1/2/3 year series for the 15 /suppliers grid suppliers, read from Docling table contexts,
validated against the PDF page text, the KB text contexts and the extracted claim texts.
Nothing is converted; units are kept as printed. Output: JSON + markdown in the scratchpad."""
import json, re, sys, collections
from pathlib import Path
import fitz

KB = Path("/Users/varunmoka/GTC/go-carbon-insights/services/hypergraph-rag/core/knowledge-base/public_sector/unicef-vaccine-suppliers-kb-v1/completion-2026-10-12/final-v1-build2")
PDF_ROOT = Path("/Users/varunmoka/GTC/go-carbon-insights/core/docs/COMPANY_REPORTS/PUBLIC_SECTOR/UN_Agencies/UNICEF_Supply/Vaccine_Suppliers")
PROTO = Path("/Users/varunmoka/GTC/unicef-supply-prototype/buyers/unicef/data")
OUT = Path(__file__).parent

climate = json.loads((PROTO / "climate.json").read_text())
GRID = [s["id"] for s in climate["suppliers"]]
NAMES = {s["id"]: s["name"] for s in climate["suppliers"]}
tables_checked = {(t["supplier"], t["pdf"], t["page"]) for t in json.loads((PROTO / "emissions-tables.json").read_text())}
ctx = json.loads((KB / "contexts.json").read_text())
claims = json.loads((KB / "claims.corrected.json").read_text())
pdfs = {p.name: p for p in PDF_ROOT.rglob("*.pdf")}

YEAR = re.compile(r"(?:FY\s?)?(20\d{2})(?:\s?[-/]\s?(\d{2,4}))?")
NUM = re.compile(r"^\(?-?\d[\d,]*(?:\.\d+)?")
EXCLUDE = re.compile(r"intensity|percent|%|biogenic|energy(?! indirect| s indirect)|per rupee|regulated|natural gas|fleet|fuel oil|biofuel|spent|renewable|avoided|offset|supplier|travel|transport|goods|waste|commut|franchise|sold products|end.of.life|investment|leased|capital|category|categories|price|target|reduction|reduc", re.I)
SC = {k: re.compile(p, re.I) for k, p in {
    "s1": r"scope\s*1\d{0,2}\b(?!\s*(?:and|&|,|\+)\s*2)",
    "s2": r"scope\s*2\d{0,2}\b",
    "s3": r"scope\s*3\d{0,2}\b",
    "s12": r"scope\s*1\s*(?:and|&|,|\+)\s*(?:scope\s*)?2|scopes?\s*1\s*&\s*2|scope1,2",
}.items()}
UNIT = [(re.compile(p, re.I), u) for p, u in [(r"Ton\s*CO\s*2\s*eq", "ton CO2eq"),
    (r"thousands? of tonnes\s*CO\s*2\s*e", "thousand tonnes CO2e"), (r"ktCO\s*2\s*e", "ktCO2e"),
    (r"million metric tons\s*CO\s*2\s*e", "million metric tons CO2e"), (r"thousand metric tons\s*CO\s*2\s*e", "thousand metric tons CO2e"),
    (r"MtCO\s*2\s*e", "MtCO2e as printed (values are metric tonnes)"), (r"metric tonnes of CO\s*2\s*equivalent", "metric tonnes CO2e"),
    (r"tonnes of CO\s*2\s*e", "tonnes CO2e"), (r"tCO\s*₂?\s*2?\s*e(?:q)?", "tCO2e"), (r"TonsCO,?\s*e|MTCO,?e", "tCO2e (printed 'TonsCO,e')"),
]]


def num(cell):
    c = cell.strip().replace("–", "-")
    orig = c
    if not c or c in {"-", "—", "B"} or re.match(r"^(n\.?a\.?|na|n/a)$", c, re.I) or "%" in c:
        return None, c
    c = re.sub(r"(?<=\d)\s+(?=\.\d)", "", c)  # "90,877 .27" -> "90,877.27"
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?\*?", c) or re.fullmatch(r"\d+,\d{1,2}\*?", c):  # Indonesian: 13.801,11
        c = c.rstrip("*").replace(".", "").replace(",", ".")
        return float(c), orig.rstrip("*")
    m = NUM.match(c)
    if not m:
        return None, c
    raw = m.group(0).strip("()")
    try:
        return float(raw.replace(",", "")), m.group(0)
    except ValueError:
        return None, c


def year_cols(cells):
    cols = {}
    for i, c in enumerate(cells):
        m = YEAR.search(c)
        if m and not re.search(r"goal|target|%|change", c, re.I):
            label = m.group(0).replace(" ", "")
            extra = re.sub(YEAR, "", c).strip(" ()")
            if re.search(r"excluding|including|restated|pro.?forma", extra, re.I):
                label += f" ({extra})"
            cols[i] = label
    return cols


def classify(label):
    L = re.sub(r"\s+", " ", label)
    if SC["s12"].search(L):
        return "s1s2" if not SC["s3"].search(L) else None
    if SC["s3"].search(L):
        return "s3" if re.search(r"total|gross|^\W*(?:other indirect ghg emissions \()?scope\s*3\W*(?:emissions)?\W*(?:korea total)?\W*$", L, re.I) else None
    if SC["s1"].search(L) and not SC["s2"].search(L):
        return "s1"
    if SC["s2"].search(L) and not re.search(r"scope\s*1", L, re.I):
        return "s2"
    return None


def boundary(label):
    if re.search(r"esrs", label, re.I):
        return "ESRS all categories"
    if re.search(r"location", label, re.I):
        return "location-based"
    if re.search(r"market", label, re.I):
        return "market-based"
    return ""


def unit_of(*texts):
    for t in texts:
        for p, u in UNIT:
            if p.search(t):
                return u
    return ""


figs = []
for c in ctx:
    if c["company_id"] not in GRID or c["content_type"] != "table":
        continue
    if c["company_id"] == "green_cross_corporation_gc_pharma" and c["page_number"] != 42:
        continue  # p41 = GC holding company, p43 = GC Cell (index p172); the supplier is GC Biopharma, p42
    lines = [l for l in c["content"].split("\n") if l.startswith("|") and not l.startswith("| ---")]
    caption = " ".join(l for l in c["content"].split("\n") if l and not l.startswith("|") and not l.startswith("[Reporting"))
    header, ycols, section, header_unit = None, {}, "", ""
    for l in lines:
        cells = [x.strip() for x in l.strip("|").split("|")]
        yc = year_cols(cells)
        if c["company_id"] == "pt_bio_farma_persero" and "Pasteurdan Cisarua" in " ".join(cells):
            header, ycols = cells, {}
            continue
        if len(yc) >= 2 or (len(yc) == 1 and all(num(x)[0] is None or re.fullmatch(r"(FY\s?)?20\d{2}", x.strip()) for x in cells)):
            header, ycols = cells, yc
            header_unit = unit_of(" ".join(cells))
            section = cells[0]
            continue
        if c["company_id"] == "pt_bio_farma_persero" and header and "Pasteurdan Cisarua" in " ".join(header) and re.fullmatch(r"20\d{2}", cells[0]):
            v, printed = num(cells[-1])
            figs.append(dict(supplier=c["company_id"], metric="s2", boundary="", year=cells[0], value=v, printed=printed, unit="ton CO2eq", label=header[-1],
                             pdf=c["source_pdf"], page=c["page_number"], context_id=c["id"], inferred=True, note="scope from the page heading CAKUPAN 2; transposed table, last column is the total"))
            continue
        if not ycols:
            continue
        first_year = min(ycols)
        core = []
        for x in cells[:first_year]:
            if x and x not in core and not (unit_of(x) and len(x) < 40):
                core.append(x)
        label = " ".join(core)
        vals = {ycols[i]: cells[i] for i in ycols if i < len(cells)}
        if all(num(v)[0] is None for v in vals.values()):
            if re.search(r"scope", label, re.I):
                section = label
            continue
        kind = classify(label)
        inferred = False
        if c["company_id"] == "pt_bio_farma_persero" and label.startswith("Total") and len(label) < 20:
            page_txt = " ".join(t["content"] for t in ctx if t["company_id"] == c["company_id"] and t["page_number"] == c["page_number"] and t["content_type"] == "text")
            sect = re.findall(r"CAKUPAN\s*([123])", page_txt)
            order = [t["id"] for t in ctx if t["company_id"] == c["company_id"] and t["page_number"] == c["page_number"] and t["content_type"] == "table" and "Total" in t["content"]]
            if sect and c["id"] in order and order.index(c["id"]) < len(sect) and "Intensitas" not in c["content"]:
                kind, inferred = "s" + sect[order.index(c["id"])], True

        if kind is None and re.search(r"scope\s*1\s*,?\s*2", section, re.I) and re.match(r"^(Subtotal|Totalgreenhousegasemissions)$", label):
            # Docling dropped the Scope 1 / Scope 2 row labels (GC Biopharma p42): subtotals in order are Scope 1 then Scope 2
            kind = {"Totalgreenhousegasemissions": "s1s2"}.get(label)
            if label == "Subtotal":
                seen = sum(1 for f in figs if f["context_id"] == c["id"] and f["label"] == "Subtotal")
                kind = ["s1", "s2"][seen // len(vals)] if seen // len(vals) < 2 else None
            inferred = kind is not None
        if kind is None and re.search(r"scope\s*3", section, re.I) and re.match(r"^(Total|Totalgreenhousegasemissions)$", label):
            kind, inferred = "s3", True
        if kind is None and SC["s12"].search(section) and re.match(r"^(Carbon emissions|GHG emissions|Total GHG emissions)\b", label, re.I) and not EXCLUDE.search(label):
            kind, inferred = "s1s2", True
        if kind is None or (EXCLUDE.search(label) and not inferred and kind != "s3"):
            continue
        if kind == "s3" and re.search(r"category|categories|purchased|travel|transport|commut|waste|capital|fuel|biogenic|excluded|intensity|per rupee", label, re.I):
            continue
        u = unit_of(label, " ".join(cells), header_unit or "", caption) or header_unit
        for y, cell in vals.items():
            v, printed = num(cell)
            figs.append(dict(supplier=c["company_id"], metric=kind, boundary=boundary(label), year=y, value=v, printed=printed.strip() if v is not None else "",
                             unit=u, label=label, pdf=c["source_pdf"], page=c["page_number"], context_id=c["id"], inferred=inferred))

# Xiamen Innovax: numbers only exist in an OCR text context (Docling returned glyph ids)
for c in ctx:
    if c["company_id"] == "xiamen_innovax_biotech_co_ltd" and "tesseract OCR" in c["content"]:
        for line in c["content"].split("\n"):
            m = re.search(r"\((Scope 1 and Scope 2|Scope 1|Scope 2) GHG emissions\).*?([\d,]+\.\d+)", line)
            if m:
                figs.append(dict(supplier=c["company_id"], metric={"Scope 1": "s1", "Scope 2": "s2", "Scope 1 and Scope 2": "s1s2"}[m.group(1)], boundary="", year="2025",
                                 value=float(m.group(2).replace(",", "")), printed=m.group(2), unit="tCO2e", label=line.split("|")[0].strip(),
                                 pdf=c["source_pdf"], page=c["page_number"], context_id=c["id"], inferred=False, note="OCR text context, not a Docling table"))

# ---- validation ----
page_text = {}
def ptext(pdf, page):
    k = (pdf, page)
    if k not in page_text:
        d = fitz.open(pdfs[pdf]); t = d[page - 1].get_text(); d.close()
        page_text[k] = re.sub(r"\s+", "", t)
    return page_text[k]

text_by_sup = collections.defaultdict(str)
for c in ctx:
    if c["content_type"] == "text" and c["company_id"] in GRID:
        text_by_sup[c["company_id"]] += re.sub(r"\s+", "", c["content"]) + "\n"
claims_by_sup = collections.defaultdict(str)
for cl in claims:
    if cl["company_id"] in GRID:
        claims_by_sup[cl["company_id"]] += re.sub(r"\s+", "", cl["claim_text"]) + "\n"

for f in figs:
    if f["value"] is None:
        f["status"] = "blank in table"
        continue
    needle = f["printed"].replace(" ", "")
    pt = ptext(f["pdf"], f["page"])
    f["on_pdf_page"] = (needle in pt) if len(pt) > 50 else None
    f["in_other_tables"] = sorted({g["context_id"] for g in figs if g is not f and g["supplier"] == f["supplier"] and g["metric"] == f["metric"] and g["year"] == f["year"] and abs(g["value"] - f["value"]) <= 1 and (g["boundary"] == f["boundary"] or not g["boundary"] or not f["boundary"])})
    f["in_text_contexts"] = needle in text_by_sup[f["supplier"]]
    f["in_claim_texts"] = needle in claims_by_sup[f["supplier"]]
    f["table_source_checked"] = (f["supplier"], f["pdf"], f["page"]) in tables_checked
    sources = (1 if f["on_pdf_page"] else 0) + (1 if f["in_other_tables"] else 0) + (1 if f["in_text_contexts"] else 0) + (1 if f["in_claim_texts"] else 0)
    if f.get("note", "").startswith("OCR"):
        f["status"] = "OCR of page (Docling got glyph ids), needs image review"
    elif f["on_pdf_page"] is None:
        f["status"] = "no text layer, needs image review"
    elif f["on_pdf_page"] and sources >= 2:
        f["status"] = "verified (on page + second source)"
    elif f["on_pdf_page"]:
        f["status"] = "on page (single source)"
    else:
        f["status"] = "NOT on page text, review"
    if f["inferred"]:
        f["status"] += "; row label inferred by position"

# conflicts: same supplier/metric/boundary/year with different values across pages
conf = []
by_key = collections.defaultdict(set)
for f in figs:
    if f["value"] is not None:
        by_key[(f["supplier"], f["metric"], f["boundary"], f["year"])].add((f["value"], f["page"], f["label"][:40]))
for k, v in by_key.items():
    vals = {x[0] for x in v}
    if len(vals) > 1 and max(vals) - min(vals) > 1:
        conf.append({"key": k, "values": sorted(v)})

# arithmetic (flagged only, never written as a figure)
arith = []
for sup in GRID:
    for yr in sorted({f["year"] for f in figs if f["supplier"] == sup}):
        g = {(f["metric"], f["boundary"]): f["value"] for f in figs if f["supplier"] == sup and f["year"] == yr and f["value"] is not None}
        s1 = g.get(("s1", "")) or g.get(("s1", "market-based"))
        for b in ("market-based", "location-based", ""):
            if s1 is not None and ("s2", b) in g and ("s1s2", "") in g:
                calc = s1 + g[("s2", b)]
                arith.append(dict(supplier=sup, year=yr, check=f"S1 + S2 {b or ''} = stated S1+2", calculated=calc, stated=g[("s1s2", "")], ok=abs(calc - g[("s1s2", "")]) <= max(1.5, 0.01 * g[("s1s2", "")])))
                break

(OUT / "scope_year_series.json").write_text(json.dumps({"figures": figs, "conflicts": conf, "arithmetic": arith}, indent=1, ensure_ascii=False))

# ---- markdown year table per supplier ----
md = ["# Scope 1/2/3 year series, 15 /suppliers grid suppliers (read 2026-10-21 from Docling table contexts; units as printed, nothing converted)\n"]
md.append(f"Figures: {len(figs)}; status counts: {dict(collections.Counter(f['status'].split(';')[0] for f in figs))}\n")
if conf:
    md.append("## Conflicts (same supplier, metric, year; different values on different pages)\n")
    for c in conf:
        md.append(f"- {c['key']}: " + "; ".join(f"{v:g} (p{p}, '{l}')" for v, p, l in c["values"]))
md.append("\n## Arithmetic checks (calculated by GoCarbonTracker, never a reported figure)\n")
for a in arith:
    md.append(f"- {a['supplier']} {a['year']}: {a['check']}: calculated {a['calculated']:g} vs stated {a['stated']:g} -> {'ok' if a['ok'] else 'MISMATCH'}")
ROW = [("s3", "ESRS all categories", "Scope 3 total (ESRS, all categories)"), ("s1", "", "Scope 1"), ("s1", "location-based", "Scope 1 (location)"), ("s1", "market-based", "Scope 1 (market)"), ("s2", "", "Scope 2"), ("s2", "location-based", "Scope 2 (location)"), ("s2", "market-based", "Scope 2 (market)"), ("s1s2", "", "Scope 1+2"), ("s3", "", "Scope 3 total")]
for sup in GRID:
    sf = [f for f in figs if f["supplier"] == sup]
    md.append(f"\n## {NAMES[sup]} ({sup})\n")
    if not sf:
        md.append("No Scope figure in any table or text context of the KB. (blank row)\n")
        continue
    years = sorted({f["year"] for f in sf}, key=lambda y: (y[:6], y))
    md.append("| metric | unit | " + " | ".join(years) + " | pages | status |")
    md.append("|---|---|" + "---|" * len(years) + "---|---|")
    for m, b, name in ROW:
        rf = [f for f in sf if f["metric"] == m and f["boundary"] == b]
        if not rf:
            continue
        cells, pages, st = [], set(), set()
        for y in years:
            fy = [f for f in rf if f["year"] == y]
            v = sorted({f["printed"] for f in fy if f["value"] is not None})
            cells.append(" / ".join(v) if v else "")
            for f in fy:
                pages.add(f["page"]); st.add(f["status"].split(";")[0] if f["value"] is not None else "blank")
        md.append(f"| {name} | {rf[0]['unit']} | " + " | ".join(cells) + f" | {', '.join('p%d' % p for p in sorted(pages))} | {'; '.join(sorted(st))} |")
(OUT / "scope_year_series.md").write_text("\n".join(md) + "\n")
print("\n".join(md))
