import type { SupplierIn } from "./mapCategories";

// A label, already placed and truncated. Rendered as
// <text transform="translate(x,y) rotate(deg)" text-anchor={anchor} dy={dy} font-size={size}>.
export interface Pos {
  x: number; y: number; deg: number;
  anchor: "start" | "middle" | "end";
  dy: number; size: number;
  text: string; full: string;
  bold?: boolean; fill?: string;
}
export interface PNode { id: string; kind: "buyer" | "supplier" | "category" | "item"; x: number; y: number; r: number; label: Pos }
export interface PLink { from: string; to: string; kind: "spend" | "category" | "item"; d: string; label: Pos }
export interface Layout { nodes: PNode[]; links: PLink[]; view: { x: number; y: number; w: number; h: number } }

// ponytail: label width is estimated from character count (Arial averages about 0.55 em);
// the estimate is what keeps labels apart. Swap for canvas measureText if a font change breaks it.
export const textWidth = (text: string, size: number, bold?: boolean) => text.length * size * (bold ? 0.62 : 0.57);
const trunc = (t: string, max: number) => (t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…");

function pos(x: number, y: number, deg: number, anchor: Pos["anchor"], dy: number, size: number, full: string, max = 999, bold?: boolean): Pos {
  return { x, y, deg, anchor, dy, size, text: trunc(full, max), full, bold };
}

export function labelBox(p: Pos): [number, number][] {
  const w = textWidth(p.text, p.size, p.bold);
  const x0 = p.anchor === "start" ? 0 : p.anchor === "end" ? -w : -w / 2;
  const top = p.dy - 0.8 * p.size, bottom = p.dy + 0.22 * p.size;
  const a = (p.deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return ([[x0, top], [x0 + w, top], [x0 + w, bottom], [x0, bottom]] as [number, number][]).map(([x, y]) => [p.x + x * c - y * s, p.y + x * s + y * c]);
}

function withView(nodes: PNode[], links: PLink[]): Layout {
  const pts: [number, number][] = [
    ...nodes.flatMap((n): [number, number][] => [[n.x - n.r, n.y - n.r], [n.x + n.r, n.y + n.r]]),
    ...[...nodes.map((n) => n.label), ...links.map((l) => l.label)].flatMap(labelBox),
  ];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), pad = 16;
  const x = Math.floor(Math.min(...xs) - pad), y = Math.floor(Math.min(...ys) - pad);
  return { nodes, links, view: { x, y, w: Math.ceil(Math.max(...xs) + pad - x), h: Math.ceil(Math.max(...ys) + pad - y) } };
}

const groupText = (label: string, isOpen: boolean) => `${label} ${isOpen ? "▾" : "▸"}`;
const SIZE = { buyer: 14, supplier: 13, spend: 11, category: 12, count: 11, item: 11 };

// ---------- Tree: UNICEF left, then suppliers, categories, items in columns ----------
const T = { row: 24, block: 56, gap: 14, x0: 40, x1: 330, x2: 570, x3: 870, item: 46 };

export function layoutTree(suppliers: SupplierIn[], open: string | null): Layout {
  const nodes: PNode[] = [], links: PLink[] = [];
  const hz = (ax: number, ay: number, bx: number, by: number) => {
    const m = (ax + bx) / 2;
    return `M${ax},${ay} C${m},${ay} ${m},${by} ${bx},${by}`;
  };
  let y = 0;
  const placed = suppliers.map((s) => {
    const rows = s.groups.reduce((n, g) => n + (g.id === open ? g.items.length : 1), 0) || 1;
    const block = Math.max(rows * T.row, T.block);
    let ry = y + (block - rows * T.row) / 2 + T.row / 2;
    const groups = s.groups.map((g) => {
      const ys = (g.id === open ? g.items : [g]).map(() => (ry += T.row) - T.row);
      return { g, ys, gy: (ys[0] + ys[ys.length - 1]) / 2 };
    });
    const sy = groups.length ? (groups[0].gy + groups[groups.length - 1].gy) / 2 : y + block / 2;
    y += block + T.gap;
    return { s, sy, groups };
  });
  const by = (y - T.gap) / 2;

  nodes.push({ id: "buyer", kind: "buyer", x: T.x0, y: by, r: 16, label: pos(T.x0, by, 0, "middle", -24, SIZE.buyer, "UNICEF", 999, true) });
  for (const { s, sy, groups } of placed) {
    nodes.push({ id: s.id, kind: "supplier", x: T.x1, y: sy, r: 10, label: pos(T.x1, sy, 0, "middle", -16, SIZE.supplier, s.label, 999, true) });
    links.push({ from: "buyer", to: s.id, kind: "spend", d: hz(T.x0 + 16, by, T.x1 - 10, sy), label: pos(T.x1 - 16, sy, 0, "end", 16, SIZE.spend, s.spendText) });
    for (const { g, ys, gy } of groups) {
      const isOpen = g.id === open;
      const lab = pos(T.x2 + 12, gy, 0, "start", 4, SIZE.category, groupText(g.label, isOpen), 999, isOpen);
      nodes.push({ id: g.id, kind: "category", x: T.x2, y: gy, r: 6, label: lab });
      links.push({ from: s.id, to: g.id, kind: "category", d: hz(T.x1 + 10, sy, T.x2 - 6, gy), label: pos(T.x2 - 12, gy, 0, "end", -4, SIZE.count, g.countText) });
      if (!isOpen) continue;
      const from = T.x2 + 12 + textWidth(lab.text, lab.size, lab.bold) + 6;
      g.items.forEach((it, i) => {
        const iy = ys[i];
        nodes.push({ id: it.id, kind: "item", x: T.x3, y: iy, r: 4, label: pos(T.x3 + 9, iy, 0, "start", 4, SIZE.item, it.label, T.item) });
        links.push({ from: g.id, to: it.id, kind: "item", d: hz(from, gy, T.x3 - 4, iy), label: pos(T.x3 - 9, iy, 0, "end", -4, SIZE.count, it.countText) });
      });
    }
  }
  return withView(nodes, links);
}

// ---------- Tree, top down: UNICEF on top, suppliers in a row, categories and items stacked below ----------
// Each supplier gets a column as wide as its widest label, so nothing overlaps and nothing is padded.
const D = { y1: 140, indent: 18, catRow: 38, itemRow: 22, colGap: 32, item: 46 };

export function layoutTreeDown(suppliers: SupplierIn[], open: string | null): Layout {
  const nodes: PNode[] = [], links: PLink[] = [];
  const right = (p: Pos) => Math.max(...labelBox(p).map(([px]) => px));
  const elbow = (ax: number, ay: number, by: number, bx: number) => `M${ax},${ay} V${by} H${bx}`;
  const cols: { s: SupplierIn; sx: number }[] = [];
  let x0 = 0;
  for (const s of suppliers) {
    const sx = x0 + 10, cx = sx + D.indent, ix = cx + D.indent;
    const mine: Pos[] = [];
    const sLab = pos(sx + 14, D.y1, 0, "start", 4, SIZE.supplier, s.label, 999, true);
    nodes.push({ id: s.id, kind: "supplier", x: sx, y: D.y1, r: 10, label: sLab });
    links.push({ from: "buyer", to: s.id, kind: "spend", d: "", label: pos(sx + 14, D.y1, 0, "start", -14, SIZE.spend, s.spendText) });
    mine.push(sLab, links[links.length - 1].label);
    let y = D.y1 + 34;
    for (const g of s.groups) {
      const isOpen = g.id === open, gy = y;
      const lab = pos(cx + 12, gy, 0, "start", 4, SIZE.category, groupText(g.label, isOpen), 999, isOpen);
      const cnt = pos(cx + 12, gy, 0, "start", 18, SIZE.count, g.countText);
      nodes.push({ id: g.id, kind: "category", x: cx, y: gy, r: 6, label: lab });
      links.push({ from: s.id, to: g.id, kind: "category", d: elbow(sx, D.y1 + 10, gy, cx - 6), label: cnt });
      mine.push(lab, cnt);
      y += D.catRow;
      if (!isOpen) continue;
      for (const it of g.items) {
        const iLab = pos(ix + 9, y, 0, "start", 4, SIZE.item, it.label, D.item);
        const iCnt = pos(right(iLab) + 8, y, 0, "start", 4, SIZE.count, it.countText);
        nodes.push({ id: it.id, kind: "item", x: ix, y, r: 4, label: iLab });
        links.push({ from: g.id, to: it.id, kind: "item", d: elbow(cx, gy + 6, y, ix - 4), label: iCnt });
        mine.push(iLab, iCnt);
        y += D.itemRow;
      }
      y += 6;
    }
    cols.push({ s, sx });
    x0 = Math.max(...mine.map(right)) + D.colGap;
  }
  // UNICEF sits above the first (largest-spend) column so it is on screen before any sideways scroll.
  const bx = cols.length ? cols[0].sx : 0;
  nodes.unshift({ id: "buyer", kind: "buyer", x: bx, y: 0, r: 16, label: pos(bx, 0, 0, "middle", -24, SIZE.buyer, "UNICEF", 999, true) });
  // Spend lines step down from UNICEF: farther columns turn higher, so the lines nest and never cross a label.
  const step = cols.length > 2 ? 70 / (cols.length - 2) : 0;
  links.filter((l) => l.kind === "spend").forEach((l, k) => {
    const sx = cols[k].sx, h = 100 - Math.max(k - 1, 0) * step;
    l.d = k === 0 ? `M${bx},16 V${D.y1 - 10}` : `M${bx},16 V${h} H${sx} V${D.y1 - 10}`;
  });
  return withView(nodes, links);
}

// ---------- Radial: UNICEF centre, suppliers on a ring, categories outside, open items beyond ----------
const R = { r1: 270, r2: 410, spokeFrom: 100, minSlots: 5, item: 34 };

export function layoutRadial(suppliers: SupplierIn[], open: string | null): Layout {
  const nodes: PNode[] = [], links: PLink[] = [];
  const at = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];
  // text along a ray, readable side up, running outward from radius r (or ending at r when inward)
  const ray = (r: number, a: number, dy: number, size: number, full: string, max = 999, bold?: boolean, inward = false): Pos => {
    const deg = (((a * 180) / Math.PI) % 360 + 360) % 360;
    const flip = deg > 90 && deg < 270;
    const [x, y] = at(r, a);
    return pos(x, y, flip ? deg + 180 : deg, flip !== inward ? "end" : "start", dy, size, full, max, bold);
  };

  const slots = suppliers.map((s) => s.groups.reduce((n, g) => n + (g.id === open ? g.items.length : 1), 0) || 1);
  const total = slots.reduce((a, n) => a + Math.max(n, R.minSlots) + 1, 0);
  const step = (2 * Math.PI) / total;
  const spokeChars = Math.floor((R.r1 - 14 - R.spokeFrom) / (SIZE.spend * 0.62));

  nodes.push({ id: "buyer", kind: "buyer", x: 0, y: 0, r: 20, label: { ...pos(0, 0, 0, "middle", 4, 10, "UNICEF", 999, true), fill: "#fff" } });
  let a0 = -Math.PI / 2;
  suppliers.forEach((s, i) => {
    const wedge = Math.max(slots[i], R.minSlots);
    let a = a0 + ((wedge - slots[i]) / 2) * step;
    const sa = a0 + (wedge / 2) * step;
    a0 += (wedge + 1) * step;
    const [sx, sy] = at(R.r1, sa);
    nodes.push({ id: s.id, kind: "supplier", x: sx, y: sy, r: 10, label: ray(R.spokeFrom, sa, -5, SIZE.spend, s.label, spokeChars, true) });
    const [bx, bby] = at(22, sa), [ex, ey] = at(R.r1 - 10, sa);
    links.push({ from: "buyer", to: s.id, kind: "spend", d: `M${bx},${bby} L${ex},${ey}`, label: ray(R.spokeFrom, sa, 13, SIZE.spend, s.spendText, spokeChars) });

    for (const g of s.groups) {
      const isOpen = g.id === open;
      const n = isOpen ? g.items.length : 1;
      const ga = a + (n / 2) * step;
      const itemAngles = Array.from({ length: n }, (_, k) => a + (k + 0.5) * step);
      a += n * step;
      const [gx, gy] = at(R.r2, ga);
      const lab = ray(R.r2 + 12, ga, 4, SIZE.category, groupText(g.label, isOpen), 999, isOpen);
      nodes.push({ id: g.id, kind: "category", x: gx, y: gy, r: 6, label: lab });
      const m = (R.r1 + R.r2) / 2;
      const [c1x, c1y] = at(m, sa), [c2x, c2y] = at(m, ga), [fx, fy] = at(R.r1 + 10, sa), [tx, ty] = at(R.r2 - 6, ga);
      links.push({ from: s.id, to: g.id, kind: "category", d: `M${fx},${fy} C${c1x},${c1y} ${c2x},${c2y} ${tx},${ty}`, label: ray(R.r2 - 12, ga, -4, SIZE.count, g.countText, 999, false, true) });
      if (!isOpen) continue;
      const end = R.r2 + 12 + textWidth(lab.text, lab.size, lab.bold) + 8;
      const r3 = end + 90;
      const [ox, oy] = at(end, ga);
      g.items.forEach((it, k) => {
        const ia = itemAngles[k];
        const [ix, iy] = at(r3, ia), [lx, ly] = at(r3 - 5, ia);
        nodes.push({ id: it.id, kind: "item", x: ix, y: iy, r: 4, label: ray(r3 + 9, ia, 4, SIZE.item, it.label, R.item) });
        links.push({ from: g.id, to: it.id, kind: "item", d: `M${ox},${oy} L${lx},${ly}`, label: ray(r3 - 9, ia, 4, SIZE.count, it.countText, 999, false, true) });
      });
    }
  });
  return withView(nodes, links);
}
