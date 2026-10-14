import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import App from "../App";

vi.stubGlobal("fetch", async (url: string) => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(join(process.cwd(), url), "utf8")),
}));

it("opens the source panel with claims, pdf and page from a climate ribbon", async () => {
  render(<MemoryRouter initialEntries={["/climate"]}><App /></MemoryRouter>);
  const ribbon = await screen.findByRole("button", { name: /AJ Vaccines, Energy consumption: 1 contexts, 7 claims/ });
  fireEvent.click(ribbon);
  const panel = screen.getByRole("dialog", { name: "Source" });
  expect(panel.textContent).toContain("AJ Vaccines: Energy consumption");
  expect(panel.textContent).toContain("AJ_Vaccine_Annual_Report_2024.pdf · page 11");
  expect(panel.textContent).not.toContain("Showing");
});

it("/hypergraph shows UNICEF Supply Division's ESG claims and opens the source panel from a hull", async () => {
  render(<MemoryRouter initialEntries={["/hypergraph"]}><App /></MemoryRouter>);
  const hull = await screen.findByRole("button", { name: /^Environmental: Scope 3 emissions baseline, \d+ claims$/ });
  expect(within(screen.getByRole("main")).queryByRole("link", { name: "Suppliers" })).toBeNull();
  fireEvent.mouseOver(hull);
  expect(screen.getByText(/environmental claims about scope 3 emissions baseline\. They name .*SBTi/)).toBeTruthy();
  fireEvent.click(hull);
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("UNICEF_Supply_Scope3_Baseline_Compendium.pdf · page");
});

it("/hypergraph opens the claims panel from nodes and breakdown rows", async () => {
  render(<MemoryRouter initialEntries={["/hypergraph"]}><App /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Personal data protection, open claims" }));
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("Topic: Personal data protection");
  fireEvent.click(screen.getByRole("button", { name: "SBTi, open claims" }));
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("Framework: SBTi");
  fireEvent.click(screen.getByRole("button", { name: /^By emissions scope: Scope 3, [\d,]+ claims$/ }));
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("By emissions scope: Scope 3");
});

it("/hypergraph keeps supply operations apart from ESG", async () => {
  render(<MemoryRouter initialEntries={["/hypergraph"]}><App /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Supply operations" }));
  expect(screen.queryByRole("button", { name: /^Environmental:/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Shipment: Vaccines, \d+ claims$/ }));
  expect(screen.getByRole("dialog", { name: "Source" }).textContent).toContain("Gavi_Shipments");
  expect(screen.getByRole("button", { name: /^By category: Procurement spend, [\d,]+ claims$/ })).toBeTruthy();
});

it("/ is an index linking to supplier intelligence and the claims hypergraph", async () => {
  render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
  expect((await screen.findByRole("link", { name: "Open supplier intelligence" })).getAttribute("href")).toBe("/suppliers");
  const main = within(screen.getByRole("main"));
  expect(main.getByRole("link", { name: "Open claims hypergraph" }).getAttribute("href")).toBe("/hypergraph");
  expect(main.getByRole("link", { name: "Supply chain map" }).getAttribute("href")).toBe("/map");
});

it("the site bar holds all seven links and marks the current page", async () => {
  render(<MemoryRouter initialEntries={["/map"]}><App /></MemoryRouter>);
  const bar = within(await screen.findByRole("navigation", { name: "Site pages" }));
  const links = bar.getAllByRole("link");
  expect(links.map((a) => a.textContent)).toEqual(["Overview", "Division portfolio", "Claims hypergraph", "Suppliers", "Supply chain map", "Climate hypergraph", "ESG claims"]);
  expect(links.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent)).toEqual(["Supply chain map"]);
});
