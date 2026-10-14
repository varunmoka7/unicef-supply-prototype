import type { Evidence, Figure } from "./buyer";

export interface MapNode { id: string; kind: "buyer" | "supplier" | "product" | "country"; label: string }
export interface MapEdge {
  from: string;
  to: string;
  kind: "spend" | "product" | "country";
  year?: string;
  figure: Figure;
  claims?: Evidence[];
}
export interface MapData { nodes: MapNode[]; edges: MapEdge[] }

// ponytail: keyword buckets on the item name, first match wins; a new antigen needs a line here.
const CATEGORIES: [string, RegExp][] = [
  ["Polio", /polio|\bipv\b|opv/],
  ["Rotavirus", /rota|\brv\d*\b|\brv1/],
  ["Pneumococcal", /pneumo|\bpcv/],
  ["HPV", /papilloma|\bhpv/],
  ["Measles", /measles|\bmr\b|\bmmr/],
  ["Influenza", /influenza|\bflu\b/],
  ["Malaria", /malaria|rts,s|as01/],
  ["DTP-containing", /\bdt\b|\btd\b|\bdtp|penta|\bhib|hepb|\bdt-/],
  ["Other vaccines", /ebola|covid|mening|cholera|typhoid|yellow fever|japanese|\bbcg\b|hepatitis|varicella|mpox|dengue|rabies/],
  ["Climate", /\bppas?\b|renewable|emission|carbon|climate/],
  ["Other medicines", /antiretroviral|\barvs?\b|cancer|medicine/],
  ["General", /vaccines\/biologicals|pharmaceutical|biological|product/],
];

export function categoryOf(label: string, kind: "product" | "country"): string {
  if (kind === "country") return "Countries";
  const l = label.toLowerCase();
  return CATEGORIES.find(([, rx]) => rx.test(l))?.[0] ?? "Other";
}

export interface ItemIn { id: string; label: string; countText: string; edge: MapEdge }
export interface GroupIn { id: string; label: string; countText: string; items: ItemIn[] }
export interface SupplierIn { id: string; label: string; spendText: string; gap: boolean; spend?: MapEdge; groups: GroupIn[] }

// Absent is not zero: a claim edge without a numeric count is reported as not counted.
export function claimCount(edges: MapEdge[]): number | null {
  const n = edges.map((e) => e.figure.value).filter((v): v is number => typeof v === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) : null;
}
const countText = (n: number | null) => (n === null ? "claims not counted" : `${n} claim${n === 1 ? "" : "s"}`);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function spendText(e: MapEdge | undefined): string {
  const f = e?.figure;
  if (!f || f.tier === "gap" || typeof f.value !== "number") return "no published figure";
  return `USD ${(f.value / 1e6).toFixed(1)} M · ${f.tier}`;
}

export function buildTree(map: MapData, year: string, only: string): SupplierIn[] {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const spend = new Map(map.edges.filter((e) => e.kind === "spend" && e.year === year).map((e) => [e.to, e]));
  const out = map.nodes
    .filter((n) => n.kind === "supplier" && (only === "all" || n.id === only))
    .map((s): SupplierIn => {
      const cats = new Map<string, MapEdge[]>();
      for (const e of map.edges) {
        if (e.kind === "spend" || e.from !== s.id) continue;
        const c = categoryOf(byId.get(e.to)?.label ?? e.to, e.kind);
        cats.set(c, [...(cats.get(c) ?? []), e]);
      }
      const groups = [...cats].map(([c, es]): GroupIn => {
        const items = es
          .map((e) => ({ e, n: typeof e.figure.value === "number" ? e.figure.value : -1, label: byId.get(e.to)?.label ?? e.to }))
          .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
          .map(({ e, label }) => ({ id: `${s.id}|${c}|${e.to}`, label, countText: countText(claimCount([e])), edge: e }));
        return { id: `${s.id}|${c}`, label: `${c} · ${plural(items.length, "item")}`, countText: countText(claimCount(es)), items };
      });
      const sum = (g: GroupIn) => claimCount(g.items.map((i) => i.edge)) ?? -1;
      groups.sort((a, b) => Number(a.label.startsWith("Countries")) - Number(b.label.startsWith("Countries")) || sum(b) - sum(a) || a.label.localeCompare(b.label));
      const e = spend.get(s.id);
      const text = spendText(e);
      return { id: s.id, label: s.label, spendText: text, gap: text === "no published figure", spend: e, groups };
    });
  const val = (s: SupplierIn) => (s.gap ? -1 : (s.spend!.figure.value as number));
  return out.sort((a, b) => val(b) - val(a) || a.label.localeCompare(b.label));
}
