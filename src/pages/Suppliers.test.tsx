import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import App from "../App";

const hasData = existsSync(join(process.cwd(), "buyers/unicef/buyer.json"));
const read = (f: string) => JSON.parse(readFileSync(join(process.cwd(), f), "utf8"));

vi.stubGlobal("fetch", async (url: string) => ({ ok: true, json: async () => read(url) }));

const open = async () => {
  render(<MemoryRouter initialEntries={["/suppliers"]}><App /></MemoryRouter>);
  await screen.findByRole("heading", { name: "Claims by supplier and concept" }, { timeout: 8000 });
};

it.skipIf(!hasData)("renders the four blocks with counts read from the files", async () => {
  const d = (n: string) => read(`buyers/unicef/data/${n}.json`);
  await open();
  for (const name of ["Coverage", "Claims by supplier and concept", "Spend by supplier and tier", "Supply-chain network"]) {
    screen.getByRole("heading", { name });
  }
  const cov = screen.getByRole("heading", { name: "Coverage" }).closest("section")!;
  expect(cov.textContent).toContain(`${d("suppliers").profiles.length}suppliers profiled`);
  expect(cov.textContent).toContain(`${d("spend").records.length}supplier-spend records`);
  expect(cov.textContent).toContain(`${d("org_hypergraph").stats.esg.claims.toLocaleString("en")}ESG claims extracted`);
}, 15000);

it.skipIf(!hasData)("a spend bar opens the panel with value, tier and source", async () => {
  type R = { name: string; spend_usd: Record<string, { value: number | null; source: string; tier: string; added_by: string }> | null };
  const rec: R = read("buyers/unicef/data/spend.json").records.find((r: R) => r.spend_usd?.["2024"]?.value != null);
  await open();
  const bar = screen.getByRole("button", { name: new RegExp(`^${rec.name.replace(/[()]/g, "\\$&")}, UNICEF spend 2024: .*tier ${rec.spend_usd!["2024"].tier}$`) });
  fireEvent.click(bar);
  const panel = screen.getByRole("dialog", { name: "Source" });
  expect(panel.textContent).toContain(rec.spend_usd!["2024"].source.slice(0, 20));
  expect(panel.textContent).toContain(rec.spend_usd!["2024"].added_by.slice(0, 20));
}, 15000);

it.skipIf(!hasData)("a supplier with no figure for the year reads 'not in the annex', never zero", async () => {
  type R = { name: string; spend_usd: Record<string, { value: number | null }> | null };
  const records: R[] = read("buyers/unicef/data/spend.json").records;
  const gaps = records.filter((r) => r.spend_usd?.["2024"]?.value == null).length;
  await open();
  const bars = screen.getByRole("heading", { name: "Spend by supplier and tier" }).closest("section")!;
  expect(within(bars).getAllByText("not in the annex")).toHaveLength(gaps);
}, 15000);

it.skipIf(!hasData)("a grid cell opens its claims; a network line opens its figure", async () => {
  await open();
  const grid = screen.getByRole("heading", { name: "Claims by supplier and concept" }).closest("section")!;
  fireEvent.click(within(grid).getAllByRole("button", { name: /extracted claims$/ }).find((b) => !b.textContent?.startsWith("0"))!);
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("Extracted, not source-checked");
  const net = screen.getByRole("heading", { name: "Supply-chain network" }).closest("section")!;
  fireEvent.click(within(net).getAllByRole("button", { name: /tier / })[0]);
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("Tier");
}, 15000);

it.skipIf(!hasData)("the verified supplier claim opens its full report page above the sidebar", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  await open();
  fireEvent.click(screen.getByRole("button", { name: /^Bavarian Nordic, SBTi: .*13 extracted claims$/ }));
  const panel = screen.getByRole("dialog", { name: "Source" });
  const claim = within(panel).getByRole("button", { name: /The current targets for Scope 1 and 2 emissions involve a 42%/ });
  claim.focus();
  fireEvent.click(claim);
  const report = screen.getByRole("dialog", { name: /Bavarian_Nordic_Annual_Report_2025.pdf · page 63/ });
  expect(within(report).getByRole("img").getAttribute("src")).toBe("/report-evidence/bavarian-nordic-2025-page-63.webp");
  expect(panel.textContent).toContain("Counting method");
  fireEvent.keyDown(report, { key: "Escape" });
  expect(screen.getByRole("dialog", { name: "Source" })).toBe(panel);
  expect(document.activeElement).toBe(claim);
}, 15000);

it.skipIf(!hasData)("a cell shows at most two evidence items, the emissions table first, and the SBTi cell shows a status label", async () => {
  await open();
  const grid = screen.getByRole("heading", { name: "Claims by supplier and concept" }).closest("section")!;
  fireEvent.click(within(grid).getByRole("button", { name: /^Bavarian Nordic, Scope 1: / }));
  let panel = screen.getByRole("dialog", { name: "Source" });
  expect(within(panel).getAllByRole("button", { name: /View highlighted report table/ })).toHaveLength(1);
  expect(within(panel).getAllByRole("button", { name: /View (highlighted|cited) report page/ })).toHaveLength(1);
  expect(panel.textContent).toContain("The most relevant of 25 claim texts, ranked by Jev");
  fireEvent.click(within(grid).getByRole("button", { name: /^Pfizer, Scope 3: / }));
  panel = screen.getByRole("dialog", { name: "Source" });
  expect(within(panel).queryAllByRole("button", { name: /View highlighted report table/ })).toHaveLength(0);
  expect(within(panel).getAllByRole("button", { name: /View (highlighted|cited) report page/ })).toHaveLength(2);
  const sbti = within(grid).getByRole("button", { name: /^GSK, SBTi: / });
  expect(sbti.textContent).toBe("Net-zero target validated");
  expect(grid.textContent).toContain("SBTi column: the target status the report states");
}, 15000);
