import type { Evidence } from "./buyer";

// Pure rules behind /suppliers/:id: claim rows, status, the year table and the bar sum.

export type Status = "verified" | "unverified" | "flagged";
export type Item = Evidence & { nature: string };
export interface Concept { id: string; label: string; group: string }
export interface ClimateCell { supplier: string; concept: string; items: Item[] }
export interface SeriesFigure {
  supplier: string; metric: string; boundary: string; year: string; value: number | null; printed: string;
  unit: string; pdf: string; page: number; status: string;
}
export type Conflict = { key: [string, string, string, string]; values: [number | null, number, string][] };
export interface Series { figures: SeriesFigure[]; conflicts: Conflict[] }

// Same cap and price rule as the claims grid on /suppliers (src/pages/Suppliers.tsx).
export const EVIDENCE_CAP = 2;
const NO_PRICE = /\b(price|prices|pricing|fee|fees|tariff|per dose)\b/i;
const METRIC_OF: Record<string, string> = { scope_1: "s1", scope_2: "s2", scope_3: "s3" };
const period = (y: unknown) => String(y ?? "").replace(/\s+/g, "");

export interface ClaimRow {
  id: string; label: string; nature: string; text: string; pdf: string; page: number;
  period: string | null; status: Status; pair: Conflict | null;
}

export function statusOf(item: Item, pair: Conflict | null): Status {
  if (pair) return "flagged";
  return item.needs_review || !item.pdf || !item.page ? "unverified" : "verified";
}

export function claimRows(supplier: string, cells: ClimateCell[], concepts: Concept[], conflicts: Conflict[]): ClaimRow[] {
  const mine = new Map(cells.filter((c) => c.supplier === supplier).map((c) => [c.concept, c]));
  return concepts.flatMap((concept) => {
    const items = (mine.get(concept.id)?.items ?? [])
      .filter((e) => !NO_PRICE.test(e.text))
      .sort((a, b) => (b.relevance ?? -1) - (a.relevance ?? -1))
      .slice(0, EVIDENCE_CAP);
    return items.map((e, i) => {
      const metric = METRIC_OF[concept.id];
      const year = period(e.year);
      const pair = metric && year ? conflicts.find((c) => c.key[0] === supplier && c.key[1] === metric && period(c.key[3]) === year) ?? null : null;
      return {
        id: `${concept.id}|${i}`, label: concept.label, nature: e.nature, text: e.text, pdf: e.pdf, page: e.page,
        period: year ? String(e.year) : null, status: statusOf(e, pair), pair,
      };
    });
  });
}

export const docName = (pdf: string) => pdf.replace(/\.pdf$/i, "").replace(/_/g, " ");

export const COLS = [
  { key: "s1", metric: "s1", boundary: "", name: "Scope 1", short: "Scope 1" },
  { key: "s2l", metric: "s2", boundary: "location-based", name: "Scope 2 location-based", short: "S2 loc." },
  { key: "s2m", metric: "s2", boundary: "market-based", name: "Scope 2 market-based", short: "S2 mkt." },
  { key: "s2u", metric: "s2", boundary: "", name: "Scope 2, method not stated", short: "S2" },
  { key: "s3", metric: "s3", boundary: "", name: "Scope 3", short: "Scope 3" },
] as const;
export type ColKey = (typeof COLS)[number]["key"];

export interface CellValue { printed: string; value: number | null; unit: string; pages: number[]; notes: string[] }
export interface YearRow { year: string; cells: Record<ColKey, CellValue[]> }

const noteOf = (status: string) => [status.startsWith("OCR") && "image review needed", status.includes("inferred") && "row label inferred"].filter(Boolean) as string[];

export function yearTable(supplier: string, figures: SeriesFigure[]): { rows: YearRow[]; other: SeriesFigure[] } {
  const mine = figures.filter((f) => f.supplier === supplier);
  const colOf = (f: SeriesFigure) => COLS.find((c) => c.metric === f.metric && c.boundary === f.boundary)?.key;
  const placed = mine.filter((f) => colOf(f));
  const years = [...new Set(placed.map((f) => f.year))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const rows = years.map((year) => {
    const cells = Object.fromEntries(COLS.map((c) => [c.key, [] as CellValue[]])) as Record<ColKey, CellValue[]>;
    for (const f of placed.filter((x) => x.year === year && x.printed !== "" && x.value !== null)) {
      const list = cells[colOf(f)!];
      const same = list.find((v) => v.printed === f.printed);
      if (same) same.pages = [...new Set([...same.pages, f.page])];
      else list.push({ printed: f.printed, value: f.value, unit: f.unit, pages: [f.page], notes: noteOf(f.status) });
    }
    return { year, cells };
  });
  return { rows, other: mine.filter((f) => !colOf(f)) };
}

// Scope 1 + Scope 2 market-based for one year, only when both are published once.
// A blank on either side gives null (drawn as an empty outline), never a one-sided sum.
export function barTotal(row: YearRow): number | null {
  const [a, b] = [row.cells.s1, row.cells.s2m];
  if (a.length !== 1 || b.length !== 1 || a[0].value === null || b[0].value === null) return null;
  return a[0].value + b[0].value;
}
