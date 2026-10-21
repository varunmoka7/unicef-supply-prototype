import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "../../buyers/unicef/data/report-evidence.json";
import climate from "../../buyers/unicef/data/climate.json";
import pages from "../../buyers/unicef/data/report-pages.json";
import map from "../../buyers/unicef/data/map.json";
import org from "../../buyers/unicef/data/org_hypergraph.json";
import spend from "../../buyers/unicef/data/spend.json";
import suppliers from "../../buyers/unicef/data/suppliers.json";
import { reviewOf } from "../components/ReportViewer";

function webpSize(path: string): [number, number] {
  const d = readFileSync(path);
  const fmt = d.toString("ascii", 12, 16);
  if (fmt === "VP8 ") return [d.readUInt16LE(26) & 0x3fff, d.readUInt16LE(28) & 0x3fff];
  if (fmt === "VP8L") { const b = d.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
  if (fmt === "VP8X") return [d.readUIntLE(24, 3) + 1, d.readUIntLE(27, 3) + 1];
  throw new Error(`not a webp: ${path}`);
}

describe("prepared report evidence", () => {
  it("has one entry per claim identity", () => {
    const keys = evidence.map((e) => `${e.pdf}|${e.page}|${e.text}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("points every entry at an existing image and keeps highlights inside the page", () => {
    for (const e of evidence) {
      expect(existsSync(`public${e.image}`), e.image).toBe(true);
      expect(e.highlights.length).toBeGreaterThan(0);
      for (const r of e.highlights) {
        for (const v of [r.x, r.y, r.width, r.height]) expect(Number.isFinite(v)).toBe(true);
        expect(r.width).toBeGreaterThan(0);
        expect(r.height).toBeGreaterThan(0);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(1);
        expect(r.y + r.height).toBeLessThanOrEqual(1);
      }
    }
  });

  it("shares one image per physical page", () => {
    const byPage = new Map<string, Set<string>>();
    for (const e of evidence) byPage.set(`${e.pdf}|${e.page}`, (byPage.get(`${e.pdf}|${e.page}`) ?? new Set()).add(e.image));
    for (const images of byPage.values()) expect(images.size).toBe(1);
    expect(evidence.length).toBeGreaterThan(byPage.size);
  });

  it("only enables claims that exist in the five frozen data files", () => {
    const known = new Set<string>();
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        if (typeof r.text === "string" && typeof r.pdf === "string" && typeof r.page === "number") known.add(`${r.pdf}|${r.page}|${r.text}`);
        Object.values(r).forEach(walk);
      }
    };
    [climate, map, org, spend, suppliers].forEach(walk);
    for (const e of evidence) expect(known.has(`${e.pdf}|${e.page}|${e.text}`), e.text).toBe(true);
  });

  it("keeps each highlight to a few small rects", () => {
    for (const e of evidence) {
      const area = e.highlights.reduce((a, r) => a + r.width * r.height, 0);
      expect(e.highlights.length, e.text).toBeLessThanOrEqual(12);
      expect(area, e.text).toBeLessThanOrEqual(Math.min(0.25, Math.max(0.1, 0.0008 * e.text.length))); // long claims on slide pages set large type
      for (const r of e.highlights) {
        expect(r.width).toBeGreaterThan(0);
        expect(r.height).toBeGreaterThan(0);
      }
    }
  });

  it("records the real pixel size of each image", () => {
    for (const e of evidence) expect(webpSize(`public${e.image}`), e.image).toEqual([e.width, e.height]);
  });

  it("gives every highlighted entry a verification the viewer recognises", () => {
    for (const e of evidence) expect(reviewOf(e.verification), e.text).not.toBe("unverified");
  });

  it("keeps the page catalog free of highlights and complete for prepared pages", () => {
    const catalog = new Set(pages.map((p) => `${p.pdf}|${p.page}`));
    for (const p of pages) expect(Object.keys(p)).not.toContain("highlights");
    expect(catalog.size).toBe(pages.length);
    for (const e of evidence) expect(catalog.has(`${e.pdf}|${e.page}`), e.image).toBe(true);
  });

  it("resolves every cited claim identity in the five data files to a page image", () => {
    const catalog = new Set(pages.map((p) => `${p.pdf}|${p.page}`));
    const ids = new Set<string>();
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        if (typeof r.text === "string" && typeof r.pdf === "string" && typeof r.page === "number") ids.add(`${r.pdf}|${r.page}|${r.text}`);
        Object.values(r).forEach(walk);
      }
    };
    [climate, map, org, spend, suppliers].forEach(walk);
    expect(ids.size).toBe(2241);
    for (const id of ids) expect(catalog.has(id.split("|").slice(0, 2).join("|")), id).toBe(true);
  });
});
