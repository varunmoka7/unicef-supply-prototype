import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTree, categoryOf, type MapData } from "./mapCategories";

describe("categoryOf", () => {
  it("buckets real map.json labels by antigen, countries apart", () => {
    const cases: [string, "product" | "country", string][] = [
      ["IPV additional awards 2026", "product", "Polio"],
      ["nOPV2 stockpile", "product", "Polio"],
      ["Rotavirus vaccine, mono, tube of 1 dose", "product", "Rotavirus"],
      ["RV1-1 tube", "product", "Rotavirus"],
      ["Pneumococcal conj.vacc,10-val.,2 ds vial for Albania", "product", "Pneumococcal"],
      ["Human Papillomavirus vaccines", "product", "HPV"],
      ["Measles containing vaccines 2021-2023", "product", "Measles"],
      ["2021 Southern Hemisphere Influenza Vaccine", "product", "Influenza"],
      ["RTS,S/AS01 vaccine", "product", "Malaria"],
      ["DTP-HepB-HiB, Pentavalent Vaccines for supply in 2021 - 2022", "product", "DTP-containing"],
      ["Td", "product", "DTP-containing"],
      ["Ebola Vaccine", "product", "Other vaccines"],
      ["green PPAs", "product", "Climate"],
      ["ARVs for Iran", "product", "Other medicines"],
      ["Vaccines/biologicals", "product", "General"],
      ["Netherlands (the)", "country", "Countries"],
    ];
    for (const [label, kind, want] of cases) expect([label, categoryOf(label, kind)]).toEqual([label, want]);
  });
});

const path = join(process.cwd(), "buyers/unicef/data/map.json");
it.skipIf(!existsSync(path))("buildTree puts every product and country leaf of map.json in a named category", () => {
  const map: MapData = JSON.parse(readFileSync(path, "utf8"));
  const tree = buildTree(map, "2024", "all");
  expect(tree).toHaveLength(15);
  const leaves = tree.flatMap((s) => s.groups.flatMap((g) => g.items));
  expect(leaves).toHaveLength(map.edges.filter((e) => e.kind !== "spend").length);
  expect(tree.flatMap((s) => s.groups.map((g) => g.label)).some((l) => l.startsWith("Other ·"))).toBe(false);
  expect(tree[0].gap).toBe(false);
  expect(tree.at(-1)!.spendText).toBe("no published figure");
});
