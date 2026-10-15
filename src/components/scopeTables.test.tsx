import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, it } from "vitest";
import SourcePanel, { tablesFor, type TableEvidence } from "./SourcePanel";
import tables from "../../buyers/unicef/data/emissions-tables.json";
import climate from "../../buyers/unicef/data/climate.json";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const real = tables as TableEvidence[];
const first = real[0];
const UNAVAILABLE = /No source-checked emissions table is available/;
const open = (supplier: string, concept: string) =>
  render(<SourcePanel item={{ title: "t", scope: { supplier, concept }, evidence: [] }} tiers={{}} onClose={() => {}} />);

it("every real table is source-checked, names a real supplier and Scope concept, and has highlights", () => {
  const scope = new Set(climate.concepts.filter((c) => c.group === "scope").map((c) => c.id));
  const suppliers = new Set(climate.suppliers.map((s) => s.id));
  expect(real.length).toBeGreaterThan(0);
  for (const t of real) {
    expect(scope.has(t.concept)).toBe(true);
    expect(suppliers.has(t.supplier)).toBe(true);
    expect(t.highlights.length).toBeGreaterThan(0);
    expect(tablesFor(real, t.supplier, t.concept).length).toBeGreaterThan(0);
  }
});

it("returns only the exact supplier and concept entries, never a neighbouring one", () => {
  for (const t of real) {
    const got = tablesFor(real, t.supplier, t.concept);
    expect(got.every((g) => g.pdf && real.some((r) => r.supplier === t.supplier && r.concept === t.concept && r.page === g.page && r.pdf === g.pdf))).toBe(true);
  }
  const otherSupplier = climate.suppliers.find((s) => s.id !== first.supplier && !real.some((r) => r.supplier === s.id && r.concept === first.concept))!;
  expect(tablesFor(real, otherSupplier.id, first.concept)).toEqual([]);
  const otherConcept = climate.concepts.find((c) => c.id !== first.concept && !real.some((r) => r.supplier === first.supplier && r.concept === c.id))!;
  expect(tablesFor(real, first.supplier, otherConcept.id)).toEqual([]);
});

it("does not treat total Scope 3 as a category, or an unreviewed entry as a table", () => {
  const fixture = [
    { ...first, supplier: "s", concept: "scope_3" },
    { ...first, supplier: "s", concept: "scope3_cat_waste", verification: "Automated match" },
  ];
  expect(tablesFor(fixture, "s", "scope3_cat_waste")).toEqual([]);
  expect(tablesFor(fixture, "s", "scope3_cat_use_of_sold")).toEqual([]);
  expect(tablesFor(fixture, "s", "scope_3")).toHaveLength(1);
});

it("opens the table in the report viewer before any claim, labelled Table", () => {
  open(first.supplier, first.concept);
  const card = screen.getAllByRole("button", { name: /View highlighted report table/ })[0];
  fireEvent.click(card);
  const viewer = document.querySelector("dialog.report-viewer")!;
  expect(viewer.textContent).toContain("Table:");
  expect(viewer.textContent).toContain("checked this table");
});

it("says so explicitly when the exact supplier and concept has no table, and offers no page", () => {
  const miss = climate.concepts.find((c) => c.group === "scope" && !real.some((r) => r.supplier === first.supplier && r.concept === c.id))!;
  open(first.supplier, miss.id);
  expect(screen.getByText(UNAVAILABLE)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /View highlighted report table/ })).toBeNull();
});

it("shows no Emissions tables section for a non-Scope click", () => {
  render(<SourcePanel item={{ title: "t", evidence: [] }} tiers={{}} onClose={() => {}} />);
  expect(screen.queryByText("Emissions tables")).toBeNull();
});
