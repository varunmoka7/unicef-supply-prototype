import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTree, type MapData } from "./mapCategories";
import { labelBox, layoutRadial, layoutTree, layoutTreeDown, type Layout, type Pos } from "./mapLayout";

const path = join(process.cwd(), "buyers/unicef/data/map.json");
const has = existsSync(path);
const tree = has ? buildTree(JSON.parse(readFileSync(path, "utf8")) as MapData, "2024", "all") : [];
const OPEN = "glaxosmithkline_biologicals_sa|Rotavirus";

// separating-axis test on two convex quads
function overlap(a: [number, number][], b: [number, number][]): boolean {
  for (const poly of [a, b])
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 4];
      const nx = y2 - y1, ny = x1 - x2;
      const pa = a.map(([x, y]) => x * nx + y * ny), pb = b.map(([x, y]) => x * nx + y * ny);
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
    }
  return true;
}
const labels = (l: Layout): Pos[] => [...l.nodes.map((n) => n.label), ...l.links.map((k) => k.label)];
function collisions(l: Layout): string[] {
  const ps = labels(l), boxes = ps.map(labelBox), out: string[] = [];
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) if (overlap(boxes[i], boxes[j])) out.push(`${ps[i].text} / ${ps[j].text}`);
  return out;
}

describe.skipIf(!has).each([
  ["tree", layoutTree],
  ["tree top-down", layoutTreeDown],
  ["radial", layoutRadial],
])("%s layout on map.json 2024", (_, layout) => {
  it("is deterministic and labels every node and link", () => {
    const l = layout(tree, null);
    expect(layout(tree, null)).toEqual(l);
    expect(labels(l).every((p) => p.text.length > 0)).toBe(true);
    expect(l.nodes.filter((n) => n.kind === "item")).toHaveLength(0);
  });

  it("opening a category adds exactly its items", () => {
    const n = tree.find((s) => s.id === "glaxosmithkline_biologicals_sa")!.groups.find((g) => g.id === OPEN)!.items.length;
    expect(layout(tree, OPEN).nodes.filter((x) => x.kind === "item")).toHaveLength(n);
  });

  it("no two labels overlap, closed or with a category open", () => {
    expect(collisions(layout(tree, null))).toEqual([]);
    expect(collisions(layout(tree, OPEN))).toEqual([]);
  });

  it("every label sits inside the view box", () => {
    const l = layout(tree, OPEN);
    const { x, y, w, h } = l.view;
    for (const p of labels(l)) for (const [px, py] of labelBox(p)) {
      expect(px).toBeGreaterThanOrEqual(x);
      expect(py).toBeGreaterThanOrEqual(y);
      expect(px).toBeLessThanOrEqual(x + w);
      expect(py).toBeLessThanOrEqual(y + h);
    }
  });
});
