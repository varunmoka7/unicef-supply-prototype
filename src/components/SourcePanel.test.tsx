import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";
import SourcePanel from "./SourcePanel";
import prepared from "../../buyers/unicef/data/report-evidence.json";
import pages from "../../buyers/unicef/data/report-pages.json";
import { reviewOf } from "./ReportViewer";

// jsdom does not implement the native dialog API or its browser focus containment.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
    this.querySelector<HTMLButtonElement>("button")?.focus();
  };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const evidence = prepared[0];
const item = { title: "Bavarian Nordic: Scope 1", evidence: [{ ...evidence, nature: "target" }] };

it("opens the exact report passage, scales highlights, and restores claim focus without closing the sidebar", () => {
  const onClose = vi.fn();
  render(<SourcePanel item={item} tiers={{}} onClose={onClose} />);
  const card = screen.getByRole("button", { name: /42% absolute reduction/ });
  card.focus();
  fireEvent.click(card);
  const viewer = screen.getByRole("dialog", { name: /Bavarian_Nordic_Annual_Report_2025/ });
  const image = within(viewer).getByRole("img") as HTMLImageElement;
  expect(image.getAttribute("src")).toBe(evidence.image);
  fireEvent.load(image);
  const marks = viewer.querySelectorAll<HTMLElement>(".report-highlight");
  expect(marks).toHaveLength(3);
  expect(parseFloat(marks[0].style.left)).toBeCloseTo(evidence.highlights[0].x * 100);
  fireEvent.change(within(viewer).getByRole("combobox"), { target: { value: "200" } });
  expect((viewer.querySelector(".report-page") as HTMLElement).style.width).toBe("200%");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(viewer, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: /Bavarian_Nordic_Annual_Report_2025/ })).toBeNull();
  expect(screen.getByRole("dialog", { name: "Source" })).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(card);
});

it("keeps text expansion when no page image exists", () => {
  render(<SourcePanel item={{ ...item, evidence: [{ ...evidence, page: 9999 }] }} tiers={{}} onClose={() => {}} />);
  const card = screen.getByRole("button", { name: /42% absolute reduction/ });
  expect(card.getAttribute("aria-haspopup")).toBeNull();
  fireEvent.click(card);
  expect(card.getAttribute("aria-expanded")).toBe("true");
  expect(screen.queryByRole("dialog", { name: /Bavarian_Nordic_Annual_Report_2025/ })).toBeNull();
});

it("shows a loading failure and closes through the button", () => {
  render(<SourcePanel item={item} tiers={{}} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /42% absolute reduction/ }));
  const viewer = screen.getByRole("dialog", { name: /Bavarian_Nordic_Annual_Report_2025/ });
  fireEvent.error(within(viewer).getByRole("img"));
  expect(within(viewer).getByRole("alert").textContent).toContain("could not load");
  fireEvent.click(within(viewer).getByRole("button", { name: "Close report" }));
  expect(screen.queryByRole("dialog", { name: /Bavarian_Nordic_Annual_Report_2025/ })).toBeNull();
});

it("tells an automatic match apart from a source-reviewed mapping", () => {
  const automatic = prepared.find((e) => e.verification.startsWith("Automated"))!;
  const reviewed = prepared.find((e) => !e.verification.startsWith("Automated"))!;
  for (const [entry, expected, other] of [[automatic, /Automatic match/, /Source-reviewed/], [reviewed, /Source-reviewed/, /Automatic match/]] as const) {
    const { unmount } = render(<SourcePanel item={{ title: "t", evidence: [{ ...entry, nature: "target" }] }} tiers={{}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /View highlighted report page/ }));
    const viewer = screen.getByRole("dialog", { name: new RegExp(entry.pdf) });
    expect(within(viewer).getByText(expected)).toBeTruthy();
    expect(within(viewer).queryByText(other)).toBeNull();
    expect(viewer.textContent).toContain(`Claim: ${entry.text}`);
    cleanup();
  }
});

it("opens a page-only claim with no highlight and an unverified message", () => {
  const key = new Set(prepared.map((e) => `${e.pdf}|${e.page}`));
  const p = pages.find((x) => !key.has(`${x.pdf}|${x.page}`))!;
  const claim = { text: "A saved claim with no verified passage.", pdf: p.pdf, page: p.page, nature: "target" };
  render(<SourcePanel item={{ title: "t", evidence: [claim] }} tiers={{}} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /View cited report page/ }));
  const viewer = screen.getByRole("dialog", { name: new RegExp(p.pdf) });
  const image = within(viewer).getByRole("img") as HTMLImageElement;
  expect(image.getAttribute("src")).toBe(p.image);
  fireEvent.load(image);
  expect(viewer.querySelectorAll(".report-highlight")).toHaveLength(0);
  expect(within(viewer).getByText(/No matching passage was verified/)).toBeTruthy();
  expect(image.alt).toContain("No passage is highlighted");
});

it("never reads an unknown or missing verification as source-reviewed", () => {
  expect(reviewOf(undefined)).toBe("unverified");
  expect(reviewOf("Reviewed by someone, method unknown.")).toBe("unverified");
  expect(reviewOf("Automated match, not individually source-checked: text diff.")).toBe("automatic");
  expect(reviewOf("Accepted after source check: claim vs quote read.")).toBe("reviewed");
  expect(reviewOf("Accepted: verbatim.")).toBe("reviewed");
});

it("caps the evidence to the most relevant items and counts a source-checked table against the cap", () => {
  const three = [0.2, 0.9, 0.5].map((relevance, i) => ({ ...evidence, text: `claim ${i}`, relevance, nature: "actual" }));
  render(<SourcePanel item={{ title: "x", evidence: three, cap: 2 }} tiers={{}} onClose={() => {}} />);
  expect(screen.getAllByRole("button", { name: /claim \d/ }).map((b) => b.querySelector(".claim-text")?.textContent)).toEqual(["claim 1", "claim 2"]);
  expect(screen.getByText(/2 most relevant of 3 claim texts/)).toBeTruthy();
  cleanup();
  render(<SourcePanel item={{ title: "x", evidence: three, cap: 2, scope: { supplier: "bavarian_nordic_a_s", concept: "scope_1" } }} tiers={{}} onClose={() => {}} />);
  expect(screen.getAllByRole("button", { name: /View highlighted report table/ })).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: /claim \d/ }).map((b) => b.querySelector(".claim-text")?.textContent)).toEqual(["claim 1"]);
  cleanup();
  render(<SourcePanel item={{ title: "x", evidence: three }} tiers={{}} onClose={() => {}} />);
  expect(screen.getAllByRole("button", { name: /claim \d/ })).toHaveLength(3);
});
