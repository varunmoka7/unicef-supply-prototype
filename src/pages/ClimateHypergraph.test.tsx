import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ClimateHypergraph, { type ClimateData } from "./ClimateHypergraph";
import climate from "../../buyers/unicef/data/climate.json";
import buyer from "../../buyers/unicef/buyer.json";

describe("ClimateHypergraph", () => {
  afterEach(cleanup);

  it("renders every supplier, marks the held ones, and selects a cell with its claims", () => {
    const onSelect = vi.fn();
    const { container } = render(<ClimateHypergraph data={climate as ClimateData} buyer={buyer} onSelect={onSelect} />);

    expect(screen.getByLabelText("Climate hypergraph")).toBeTruthy();
    expect(screen.getAllByText(/boundary hold/)).toHaveLength(2);
    expect(container.querySelectorAll("g[role=button]").length).toBe(climate.cells.length);

    fireEvent.click(container.querySelector("g[role=button]")!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const sel = onSelect.mock.calls[0][0];
    expect(sel.title).toContain(":");
    expect(Array.isArray(sel.claims)).toBe(true);
  });

  it("nature filter hides ribbons without that nature", () => {
    const { container } = render(<ClimateHypergraph data={climate as ClimateData} buyer={buyer} onSelect={() => {}} />);
    for (const n of ["commitment", "actual", "projection"]) fireEvent.click(screen.getByRole("button", { name: n }));
    const want = climate.cells.filter((c) => c.natures.target > 0).length;
    expect(container.querySelectorAll("g[role=button]").length).toBe(want);
  });

  it("states truncation and keeps contexts-only cells visible as a gap", () => {
    const onSelect = vi.fn();
    const { container } = render(<ClimateHypergraph data={climate as ClimateData} buyer={buyer} onSelect={onSelect} />);
    const buttons = [...container.querySelectorAll("g[role=button]")];
    const dashed = buttons.filter((b) => b.querySelector("path[stroke-dasharray='4 3']"));
    expect(dashed.length).toBe(climate.cells.filter((c) => c.claims === 0).length);

    fireEvent.click(dashed[0]);
    expect(onSelect.mock.lastCall![0].note).toMatch(/gap, not zero/);

    const truncated = climate.cells.findIndex((c) => c.claims > c.items.length);
    const label = (c: (typeof climate.cells)[number]) =>
      `${climate.suppliers.find((s) => s.id === c.supplier)!.name}, ${climate.concepts.find((k) => k.id === c.concept)!.label}: ${c.contexts} contexts, ${c.claims} claims`;
    fireEvent.click(buttons.find((b) => b.getAttribute("aria-label") === label(climate.cells[truncated]))!);
    const c = climate.cells[truncated];
    expect(onSelect.mock.lastCall![0].note).toBe(`Showing ${c.items.length} of ${c.claims} claims; the rest are not in the extract.`);
  });
});
