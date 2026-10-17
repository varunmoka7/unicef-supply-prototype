// Three claims copied verbatim from buyers/unicef/data/report-evidence.json.
// Highlight boxes are the union of that entry's highlight rectangles (page-relative, 0 to 1).

export interface Chapter {
  supplier: string;
  text: string;
  pdf: string;
  page: number;
  image: string;
  width: number;
  height: number;
  bbox: { x: number; y: number; w: number; h: number };
  highlights: { x: number; y: number; width: number; height: number }[];
  verification: string;
}

export const CHAPTERS: Chapter[] = [
  {
    supplier: "GSK",
    text: "This year we achieved our 2025 target to transition 100% of imported electricity to renewable sources.",
    pdf: "GSK_Responsible_Business_Report_2025.pdf",
    page: 18,
    image: "/report-evidence/gsk-responsible-business-report-2025-page-18.webp",
    width: 2268,
    height: 3206,
    bbox: { x: 0.0857, y: 0.2641, w: 0.3693, h: 0.0241 },
    highlights: [
      { x: 0.08568453622291568, y: 0.2640670815299543, width: 0.3693128504301439, height: 0.012068127208788052 },
      { x: 0.08568453622291568, y: 0.2761857160416343, width: 0.2585661620106996, height: 0.012068127208788052 },
    ],
    verification: "Accepted: verbatim.",
  },
  {
    supplier: "Sanofi",
    text: "To address Sanofi's corporate emissions, a 2045 Scope 3 target was set for a 'net zero' aligned above 90% of baseline-year Scope 3 GHG emissions reduction.",
    pdf: "Sanofi_Sustainability_Statement_2025.pdf",
    page: 26,
    image: "/report-evidence/sanofi-sustainability-statement-2025-page-26.webp",
    width: 2268,
    height: 3208,
    bbox: { x: 0.0905, y: 0.5276, w: 0.8192, h: 0.0242 },
    highlights: [
      { x: 0.09046011265395026, y: 0.5276101246294501, width: 0.8192378120645354, height: 0.012115467289753504 },
      { x: 0.09046011265395026, y: 0.5397255919192037, width: 0.23058767653508874, height: 0.012115467289753504 },
    ],
    verification: "Accepted: verbatim.",
  },
  {
    supplier: "Bavarian Nordic",
    text: "The current targets for Scope 1 and 2 emissions involve a 42% absolute reduction by 2030, using 2023 as the base year.",
    pdf: "Bavarian_Nordic_Annual_Report_2025.pdf",
    page: 63,
    image: "/report-evidence/bavarian-nordic-2025-page-63.webp",
    width: 2268,
    height: 1276,
    bbox: { x: 0.2875, y: 0.2062, w: 0.183, h: 0.0671 },
    highlights: [
      { x: 0.2875015147984623, y: 0.20620532550993267, width: 0.17841900190105944, height: 0.020147537476345612 },
      { x: 0.2875015147984623, y: 0.22972385453963007, width: 0.1830121467155233, height: 0.020147537476345612 },
      { x: 0.2875015147984623, y: 0.2532423835693275, width: 0.08419476947240201, height: 0.020147537476345612 },
    ],
    verification: "Exact report text matched on physical PDF page 63.",
  },
];

export const DIRECTORY: { name: string; rows: [string, string, string][] }[] = [
  {
    name: "Suppliers",
    rows: [
      ["/suppliers", "Open supplier intelligence", "UNICEF spend by year, what each supplier's reports claim on climate and ESG, and how they connect to products and countries."],
      ["/map", "Supply chain map", "UNICEF spend by supplier and year, and the product groups each supplier's claims attach to."],
      ["/climate", "Climate hypergraph", "Which suppliers made claims on which emissions concepts, and what kind of claim each one is."],
      ["/segments", "ESG claims", "Every extracted ESG claim from supplier reports, grouped by concept, supplier or claim nature."],
    ],
  },
  {
    name: "UNICEF Supply Division",
    rows: [
      ["/portfolio", "Division portfolio", "Emissions, procurement and supplier reach, from the Division's own reports."],
      ["/hypergraph", "Open claims hypergraph", "The Division's own reports, no supplier reports. ESG claims and supply operations apart, each grouped by topic, with the claims behind every group."],
    ],
  },
];
