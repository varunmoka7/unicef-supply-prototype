import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import App from "../App";
import { barTotal, claimRows, statusOf, yearTable, type ClimateCell, type Conflict, type Item, type SeriesFigure } from "../lib/supplierPage";

const hasData = existsSync(join(process.cwd(), "buyers/unicef/buyer.json"));
const read = (f: string) => JSON.parse(readFileSync(join(process.cwd(), f), "utf8"));
vi.stubGlobal("fetch", async (url: string) => ({ ok: true, json: async () => read(url) }));

const item = (o: Partial<Item> = {}): Item => ({ text: "Scope 1 fell.", nature: "actual", pdf: "A.pdf", page: 3, year: "FY2024-25", needs_review: false, relevance: 1, ...o });
const pair: Conflict = { key: ["s", "s1", "", "FY2024-25"], values: [[1, 61, "a"], [2, 62, "b"]] };
const fig = (o: Partial<SeriesFigure>): SeriesFigure => ({ supplier: "s", metric: "s1", boundary: "", year: "2023", value: 10, printed: "10", unit: "t", pdf: "A.pdf", page: 1, status: "verified", ...o });
const concepts = [{ id: "scope_1", label: "Scope 1", group: "scope" }, { id: "framework_sbti", label: "SBTi", group: "framework" }];

it("status: flagged by a conflict for the same supplier, metric and period; unverified by needs_review; else verified", () => {
  expect(statusOf(item(), null)).toBe("verified");
  expect(statusOf(item({ needs_review: true }), null)).toBe("unverified");
  expect(statusOf(item(), pair)).toBe("flagged");
  const cells: ClimateCell[] = [
    { supplier: "s", concept: "scope_1", items: [item({ year: "FY 2024-25" }), item({ year: "2023", relevance: 0.5 }), item({ needs_review: true, year: null, relevance: 0.1 })] },
    { supplier: "s", concept: "framework_sbti", items: [item({ year: "FY2024-25" })] },
  ];
  const rows = claimRows("s", cells, concepts, [pair]);
  // cap of 2 per cell, most relevant first; the period match ignores spaces; SBTi is a different metric
  expect(rows.map((r) => [r.label, r.status])).toEqual([["Scope 1", "flagged"], ["Scope 1", "verified"], ["SBTi", "verified"]]);
  expect(claimRows("other", cells, concepts, [pair])).toEqual([]);
});

it("bar: a year with Scope 1 but no Scope 2 market-based is null, never a one-sided sum", () => {
  const figs = [
    fig({ year: "2022", value: 10, printed: "10" }),
    fig({ year: "2023", value: 10, printed: "10" }), fig({ year: "2023", metric: "s2", boundary: "market-based", value: 5, printed: "5" }),
    fig({ year: "2024", value: 10, printed: "10" }), fig({ year: "2024", metric: "s2", boundary: "location-based", value: 7, printed: "7" }),
    fig({ year: "2025", value: 10, printed: "10" }), fig({ year: "2025", metric: "s2", boundary: "market-based", value: null, printed: "" }),
  ];
  const { rows } = yearTable("s", figs);
  expect(rows.map((r) => [r.year, barTotal(r)])).toEqual([["2022", null], ["2023", 15], ["2024", null], ["2025", null]]);
  expect(rows[3].cells.s2m).toEqual([]);
});

it("year table: two values for one year and metric are both kept; a figure that fits no column goes to other", () => {
  const figs = [fig({ page: 61, value: 44532, printed: "44,532" }), fig({ page: 62, value: 44525, printed: "44,525" }), fig({ page: 62, metric: "s1s2", value: 99, printed: "99" })];
  const { rows, other } = yearTable("s", figs);
  expect(rows[0].cells.s1.map((v) => v.printed)).toEqual(["44,532", "44,525"]);
  expect(barTotal(rows[0])).toBeNull();
  expect(other).toHaveLength(1);
});

const open = async (id: string) => {
  render(<MemoryRouter initialEntries={[`/suppliers/${id}`]}><App /></MemoryRouter>);
  return screen.findByRole("heading", { level: 1 }, { timeout: 8000 });
};

it.skipIf(!hasData)("GSK page renders real claims; selecting one shows its page and passage; counts come from the rows", async () => {
  const climate = read("buyers/unicef/data/climate.json");
  const rows = claimRows("glaxosmithkline_biologicals_sa", climate.cells, climate.concepts, read("docs/scope-year-series-2026-10-21.json").conflicts);
  await open("glaxosmithkline_biologicals_sa");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("GSK");
  const table = screen.getByRole("table", { name: /Climate claims from GSK/ });
  expect(within(table).getAllByRole("button")).toHaveLength(rows.length);
  expect(screen.getByRole("button", { name: new RegExp(`^All ${rows.length}$`) })).toBeTruthy();
  const first = within(table).getAllByRole("button")[0];
  fireEvent.click(first);
  expect(first.getAttribute("aria-pressed")).toBe("true");
  const card = screen.getByRole("complementary");
  expect(card.textContent).toContain(`p.${rows[0].page}`);
  expect(card.textContent).toContain(rows[0].text.slice(0, 30));
  // unverified rows exist in the file for GSK; the filter narrows the list and says how many
  fireEvent.click(screen.getByRole("button", { name: /^Unverified/ }));
  expect(screen.getByText(/of \d+ shown/).textContent).toBe(`${rows.filter((r) => r.status === "unverified").length} of ${rows.length} shown`);
  expect(screen.getByRole("complementary").textContent).toContain("Select a claim.");
  // year table carries the printed GSK Scope 1 value
  expect(screen.getByRole("table", { name: /Emissions by year/ }).textContent).toContain("626");
}, 20000);

it.skipIf(!hasData)("a supplier with no scope figure shows a blank year table and no zeros", async () => {
  await open("aj_vaccine_a_s");
  const t = screen.getByRole("table", { name: /Emissions by year/ });
  expect(t.textContent).toContain("no Scope 1, 2 or 3 figure read for this supplier");
  expect(t.querySelectorAll("tbody td")[0]!.textContent).not.toMatch(/\b0\b/);
  expect(screen.getByText(/no year has both Scope 1 and Scope 2 market-based/i)).toBeTruthy();
}, 20000);

it.skipIf(!hasData)("an unknown id says so instead of an empty page", async () => {
  render(<MemoryRouter initialEntries={["/suppliers/nobody"]}><App /></MemoryRouter>);
  expect((await screen.findByRole("alert", {}, { timeout: 8000 })).textContent).toContain("nobody");
}, 20000);
