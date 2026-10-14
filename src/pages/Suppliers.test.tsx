import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import App from "../App";

// buyers/ is owned by the data builders; without their files there is nothing to render.
const hasData = existsSync(join(process.cwd(), "buyers/unicef/buyer.json"));
const read = (f: string) => JSON.parse(readFileSync(join(process.cwd(), f), "utf8"));

// The data files come from the data builders; the test serves them from disk.
vi.stubGlobal("fetch", async (url: string) => ({ ok: true, json: async () => read(url) }));

const open = async () => {
  render(<MemoryRouter initialEntries={["/suppliers"]}><App /></MemoryRouter>);
  await screen.findByRole("table");
  return screen.getAllByRole("row").slice(1);
};

it.skipIf(!hasData)("renders one row per supplier, 2025 spend descending, suppliers without 2025 last", async () => {
  const profiles = read("buyers/unicef/data/suppliers.json").profiles;
  const rows = await open();
  expect(rows).toHaveLength(profiles.length);

  const spend = (p: { spend: { years: Record<string, { value: number | null }> } | null }) => p.spend?.years["2025"]?.value ?? null;
  const withSpend = profiles.filter((p: never) => spend(p) !== null).sort((a: never, b: never) => spend(b)! - spend(a)!);
  const first = within(rows[0]).getAllByRole("button")[0].textContent;
  expect(first).toBe(withSpend[0].name);
  const lastWithSpend = rows.findIndex((r) => r.textContent?.includes(withSpend[withSpend.length - 1].name));
  expect(lastWithSpend).toBe(withSpend.length - 1);
});

it.skipIf(!hasData)("a missing spend year reads 'not in the annex', never zero", async () => {
  type P = { name: string; spend: { years: Record<string, { value: number | null } | undefined> } | null };
  const gaps = (p: P) => ["2019", "2024", "2025"].filter((y) => p.spend?.years[y]?.value == null).length;
  const profile = read("buyers/unicef/data/suppliers.json").profiles.find((p: P) => gaps(p) > 0);
  const rows = await open();
  const row = rows.find((r) => r.textContent?.includes(profile.name))!;
  expect(within(row).getAllByText("not in the annex")).toHaveLength(gaps(profile));
});

it.skipIf(!hasData)("a climate mark opens the source panel with tier and pdf and page", async () => {
  const cells = read("buyers/unicef/data/climate.json").cells;
  const cell = cells.find((c: { concept: string; items: unknown[] }) => c.concept === "framework_sbti" && c.items.length)!;
  const profile = read("buyers/unicef/data/suppliers.json").profiles.find((p: { id: string }) => p.id === cell.supplier);
  await open();
  const opener = screen.getAllByRole("button", { name: new RegExp(`${profile.name.replace(/[()]/g, "\\$&")}, SBTi:`) })[0];
  opener.focus();
  fireEvent.click(opener);
  const panel = screen.getByRole("dialog", { name: "Source" });
  expect(panel.getAttribute("aria-modal")).toBeNull();
  expect(document.activeElement).toBe(within(panel).getByRole("button", { name: "Close source panel" }));
  opener.focus();
  expect(document.activeElement).toBe(opener);
  within(panel).getByRole("button", { name: "Close source panel" }).focus();
  expect(panel.textContent).toContain("claim_extracted");
  expect(panel.textContent).toContain(cell.items[0].pdf);
  expect(panel.textContent).toContain(`page ${cell.items[0].page}`);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});

it.skipIf(!hasData)("a spend bar opens the panel with its annex source", async () => {
  const merck = read("buyers/unicef/data/suppliers.json").profiles.find((p: { id: string }) => p.id === "merck_co_inc");
  await open();
  fireEvent.click(screen.getByRole("button", { name: /Merck & Co.*UNICEF spend 2024/ }));
  const panel = screen.getByRole("dialog", { name: "Source" });
  expect(panel.textContent).toContain(merck.spend.years["2024"].source.slice(0, 20));
});

it.skipIf(!hasData)("a supplier name opens the panel with its UNICEF-document claims", async () => {
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Merck & Co" }));
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("page");
});

it.skipIf(!hasData)("own_by_nature sums to own_total for every profile and the mix row renders it", async () => {
  type P = { name: string; own_total: number; own_by_nature: Record<string, number> };
  const profiles: P[] = read("buyers/unicef/data/suppliers.json").profiles;
  for (const p of profiles) expect(Object.values(p.own_by_nature).reduce((a, b) => a + b, 0)).toBe(p.own_total);
  const gsk = profiles.find((p) => p.name === "GSK")!;
  await open();
  const mix = screen.getByRole("button", { name: new RegExp(`^GSK, own-report claims: ${gsk.own_total} total.*${gsk.own_by_nature.actual} measured`) });
  expect(mix.getAttribute("aria-label")).toContain("84 measured");
  fireEvent.click(mix);
  const panel = screen.getByRole("dialog", { name: "Source" });
  expect(panel.textContent).toContain("examples, not the mix");
  expect(panel.textContent).toContain("84 measured");
});
