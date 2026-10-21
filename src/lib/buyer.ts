import { useEffect, useState } from "react";

// Only `unicef` exists; a second buyer is a second folder under buyers/.
export const BUYER_ID: string = import.meta.env.VITE_BUYER ?? "unicef";

export interface Figure {
  value: number | null;
  unit?: string;
  source: string;
  tier: string;
  added_by: string;
  flag?: string;
  note?: string;
}

export interface Evidence {
  text: string;
  pdf: string;
  page: number;
  year?: string | number | null;
  nature?: string;
  needs_review?: boolean;
  relevance?: number; // Jev probability that this is the best evidence in its cell (rank_evidence.py)
}

export interface Buyer {
  id: string;
  name: string;
  short_name: string;
  colours: Record<string, string>;
  logo: string | null;
  suppliers: { id: string; name: string; alias: string; boundary_hold: boolean }[];
  disclaimers: string[];
  tiers: Record<string, string>;
}

export interface SpendYear {
  value: number | null;
  source: string;
  tier: string;
  added_by: string;
  flag?: string;
  note?: string;
}

export interface UnicefClaim extends Evidence {
  category: string;
  matched_supplier: string;
}

export interface OwnClaim extends Evidence {
  nature: string;
  needs_review: boolean;
}

export interface Profile {
  id: string;
  name: string;
  boundary_hold: boolean;
  spend: { record: string; parent?: string; years: Record<string, SpendYear> } | null;
  unicef_total: number;
  unicef_by_category: Record<string, number>;
  unicef_claims: UnicefClaim[];
  own_total: number;
  own_by_nature: Record<string, number>;
  own_claims: OwnClaim[];
}

// Data files belong to the data builders and are not part of this app's source:
// the glob yields asset URLs for whatever exists under buyers/, so the build
// passes with or without them and the pages fetch at runtime.
const urls = import.meta.glob(["../../buyers/*/buyer.json", "../../buyers/*/data/*.json"], { query: "?url", eager: true }) as Record<string, string | { default: string }>;

export function useBuyerJson<T>(name: string): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    const hit = urls[name === "buyer" ? `../../buyers/${BUYER_ID}/buyer.json` : `../../buyers/${BUYER_ID}/data/${name}.json`];
    const url = typeof hit === "string" ? hit : hit?.default;
    if (!url) return setState({ data: null, error: `${name}.json for buyer ${BUYER_ID} is not in this build` });
    let live = true;
    setState({ data: null, error: null });
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: T) => live && setState({ data, error: null }))
      .catch((e: Error) => live && setState({ data: null, error: `Could not read ${name}.json: ${e.message}` }));
    return () => {
      live = false;
    };
  }, [name]);
  return state;
}
