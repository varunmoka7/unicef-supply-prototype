import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import EsgSegments, { placeLabels } from "./EsgSegments";
import climate from "../../buyers/unicef/data/climate.json";

vi.mock("../lib/buyer", async (orig) => ({
  ...(await orig<typeof import("../lib/buyer")>()),
  useBuyerJson: () => ({ data: climate, error: null }),
}));

describe("EsgSegments", () => {
  afterEach(cleanup);

  it("one dot per cell by concept, opens the cell's claims on click", () => {
    const onOpen = vi.fn();
    const { container } = render(<EsgSegments onOpen={onOpen} />);
    const dots = container.querySelectorAll("circle[role=button]");
    expect(dots.length).toBe(climate.cells.length);
    const cited = climate.cells.reduce((s, c) => s + c.items.length, 0);
    expect(container.querySelector(".seg-stats")!.textContent).toContain(`${cited} cited claim appearances`);
    expect(container.querySelector(".seg-stats")!.textContent).not.toContain("unique claims");
    expect(screen.getByText(/Their source context has the concept tag/).textContent).toContain("the claim may not mention it");

    const withClaims = climate.cells.find((c) => c.claims > 0)!;
    const dot = [...dots].find((d) => d.getAttribute("aria-label")!.endsWith(`: ${withClaims.claims} claims`))!;
    fireEvent.click(dot);
    const item = onOpen.mock.lastCall![0];
    expect(item.title).toContain(":");
    expect(item.evidence[0]).toMatchObject({ pdf: expect.any(String), page: expect.any(Number) });
  });

  it("no two hub labels overlap at default zoom, in every Group by mode", () => {
    const { container } = render(<EsgSegments onOpen={() => {}} />);
    const labels = () => [...container.querySelectorAll("g.seg-hub")].map((g) => {
      const [x, y] = g.getAttribute("transform")!.match(/-?[\d.]+/g)!.map(Number);
      const t = g.querySelector("text")!;
      return { label: t.textContent!, x, y: y + Number(t.getAttribute("y")) };
    });
    expect(labels().some((b) => b.label.includes("Cat 7")) && labels().some((b) => b.label.includes("Cat 9"))).toBe(true);
    for (const mode of ["Concept", "Supplier", "Claim nature"]) {
      fireEvent.click(screen.getByRole("button", { name: mode }));
      const got = labels();
      expect(got.length, mode).toBeGreaterThan(1);
      expectApart(got, mode);
    }
  });

  it("labels of hubs dragged on top of each other still take separate rows", () => {
    const hub = (id: string, label: string, x: number, y: number) => ({ id, label, colour: "#fff", isHub: true as const, x, y });
    const hubs = [
      hub("a", "Scope 3 Cat 7", 500, 300),
      hub("b", "Scope 3 Cat 9", 500, 300),
      hub("c", "Scope 3 Cat 1", 504, 302),
      hub("d", "Scope 2", 510, 290),
      hub("e", "far away", 900, 300),
    ];
    const dy = placeLabels(hubs);
    expectApart(hubs.map((h) => ({ label: h.label, x: h.x, y: h.y + dy.get(h.id)! })), "stacked");
    expect(dy.get("e")).toBe(-14);
  });

  it("claim nature mode and supplier filter change the dot set", () => {
    const { container } = render(<EsgSegments onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim nature" }));
    const want = climate.cells.reduce((s, c) => s + Object.values(c.natures).filter((n) => n > 0).length, 0);
    expect(container.querySelectorAll("circle[role=button]").length).toBe(want);

    fireEvent.click(screen.getByRole("button", { name: "Concept" }));
    const sid = climate.suppliers[0].id;
    fireEvent.change(screen.getByLabelText("Supplier"), { target: { value: sid } });
    expect(container.querySelectorAll("circle[role=button]").length).toBe(climate.cells.filter((c) => c.supplier === sid).length);
    const cited = climate.cells.filter((c) => c.supplier === sid).reduce((n, c) => n + c.items.length, 0);
    expect(container.querySelector(".seg-stats")!.textContent).toContain(`${cited} cited claim appearances`);
  });

  it("opens only commitment evidence for the AJ Vaccines energy commitment dot", () => {
    const onOpen = vi.fn();
    const { container } = render(<EsgSegments onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim nature" }));
    fireEvent.click(container.querySelector('[data-id="aj_vaccine_a_s|metric_energy|commitment"]')!);
    const item = onOpen.mock.lastCall![0];
    const cell = climate.cells.find((c) => c.supplier === "aj_vaccine_a_s" && c.concept === "metric_energy")!;
    expect(item.title).toContain("(commitment)");
    expect(item.evidence).toEqual(cell.items.filter((i) => i.nature === "commitment"));
    expect(item.evidence).toHaveLength(1);
    expect(item.note).toBeUndefined();
  });
});

function expectApart(labels: { label: string; x: number; y: number }[], ctx: string) {
  const box = (b: (typeof labels)[number]) => ({ ...b, x0: b.x - (b.label.length * 6.5) / 2, x1: b.x + (b.label.length * 6.5) / 2 });
  const boxes = labels.map(box);
  for (const a of boxes)
    for (const b of boxes)
      if (a !== b) expect(a.x0 < b.x1 && b.x0 < a.x1 && Math.abs(a.y - b.y) < 14, `${ctx}: ${a.label} / ${b.label}`).toBe(false);
}
