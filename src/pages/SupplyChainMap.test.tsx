import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import App from "../App";

const hasData = existsSync(join(process.cwd(), "buyers/unicef/data/map.json"));

vi.stubGlobal("fetch", async (url: string) => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(join(process.cwd(), url), "utf8")),
}));

it.skipIf(!hasData)("tree by default, year relabels spend, radial toggles, category opens items, clicks open the source panel", async () => {
  const { container } = render(<MemoryRouter initialEntries={["/map"]}><App /></MemoryRouter>);
  const map = await screen.findByRole("group", { name: "Supply chain map" });
  expect(screen.getByRole("button", { name: "Tree" }).getAttribute("aria-pressed")).toBe("true");

  // every drawn edge is thin; gap edges are labelled
  const widths = [...container.querySelectorAll(".edge path")]
    .filter((p) => p.getAttribute("stroke") !== "transparent")
    .map((p) => Number(p.getAttribute("stroke-width")));
  expect(Math.max(...widths)).toBeLessThanOrEqual(1.5);
  expect(within(map).getAllByText("no published figure").length).toBeGreaterThan(0);

  const gsk = () => within(map).getByRole("button", { name: /^GSK, spend/ });
  const spend24 = gsk().getAttribute("aria-label");
  fireEvent.click(screen.getByRole("button", { name: "2019" }));
  expect(gsk().getAttribute("aria-label")).not.toBe(spend24);

  // supplier click opens the spend figure
  fireEvent.click(gsk());
  expect(within(screen.getByRole("dialog", { name: "Source" })).getByText("Tier")).toBeTruthy();

  // category click opens its items and all its claims
  expect(within(map).queryByText("RV1-1 tube")).toBeNull();
  fireEvent.click(within(map).getByRole("button", { name: /^GSK: Rotavirus .*closed$/ }));
  expect(within(map).getByText("RV1-1 tube")).toBeTruthy();
  expect(within(screen.getByRole("dialog", { name: "Source" })).getAllByText(/model-extracted, not source-checked/).length).toBeGreaterThan(0);

  // item click opens its claims
  fireEvent.click(within(map).getByRole("button", { name: /^RV1-1 tube, \d+ claim/ }));
  expect(within(screen.getByRole("dialog", { name: "Source" })).getByText(/RV1-1 tube, from GSK/)).toBeTruthy();

  // radial keeps the open category and every label
  fireEvent.click(screen.getByRole("button", { name: "Radial" }));
  expect(within(map).getByText("RV1-1 tube")).toBeTruthy();
  expect(within(map).getAllByText("no published figure").length).toBeGreaterThan(0);
});

it.skipIf(!hasData)("top-down orientation reads ?orient=down, keeps clicks, and shows only in Tree view", async () => {
  render(<MemoryRouter initialEntries={["/map?orient=down"]}><App /></MemoryRouter>);
  const map = await screen.findByRole("group", { name: "Supply chain map" });
  expect(screen.getByRole("button", { name: "Top down" }).getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(within(map).getByRole("button", { name: /^GSK, spend/ }));
  expect(within(screen.getByRole("dialog", { name: "Source" })).getByText("Tier")).toBeTruthy();
  fireEvent.click(within(map).getByRole("button", { name: /^GSK: Rotavirus .*closed$/ }));
  fireEvent.click(within(map).getByRole("button", { name: /^RV1-1 tube, \d+ claim/ }));
  expect(within(screen.getByRole("dialog", { name: "Source" })).getByText(/RV1-1 tube, from GSK/)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Left to right" }));
  expect(screen.getByRole("button", { name: "Top down" }).getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Radial" }));
  expect(screen.queryByRole("group", { name: "Orientation" })).toBeNull();
});
