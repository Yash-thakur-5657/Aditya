import { properties as propertyRepo } from "../db/repository";
import type { Property, PropertySearchQuery } from "../types";

export interface MatchResult {
  properties: Property[];
  relaxed: boolean;
  relaxedReason: string | null;
}

/**
 * Tries an exact-ish match first (city/state/type/budget/bhk with tolerance already
 * baked into the repo query). If nothing comes back, progressively relaxes filters
 * so the agent can still say "nothing exact, but here's close by" instead of a dead end.
 */
export function matchProperties(query: PropertySearchQuery): MatchResult {
  const strict = propertyRepo.search(query);
  if (strict.length > 0) {
    return { properties: strict, relaxed: false, relaxedReason: null };
  }

  if (query.bhkPreference) {
    const withoutBhk = propertyRepo.search({ ...query, bhkPreference: undefined });
    if (withoutBhk.length > 0) {
      return { properties: withoutBhk, relaxed: true, relaxedReason: "bhk_relaxed" };
    }
  }

  if (query.budgetMaxInr) {
    const widerBudget = propertyRepo.search({
      ...query,
      budgetMaxInr: Math.round(query.budgetMaxInr * 1.35),
    });
    if (widerBudget.length > 0) {
      return { properties: widerBudget, relaxed: true, relaxedReason: "budget_relaxed" };
    }
  }

  if (query.locality) {
    const withoutLocality = propertyRepo.search({ ...query, locality: undefined });
    if (withoutLocality.length > 0) {
      return { properties: withoutLocality, relaxed: true, relaxedReason: "locality_relaxed" };
    }
  }

  if (query.propertyType) {
    const withoutType = propertyRepo.search({ ...query, propertyType: undefined });
    if (withoutType.length > 0) {
      return { properties: withoutType, relaxed: true, relaxedReason: "type_relaxed" };
    }
  }

  return { properties: [], relaxed: true, relaxedReason: "no_match" };
}

export function formatPriceInr(price: number): string {
  if (price >= 10000000) return `${(price / 10000000).toFixed(price % 10000000 === 0 ? 0 : 2)} crore`;
  if (price >= 100000) return `${(price / 100000).toFixed(price % 100000 === 0 ? 0 : 1)} lakh`;
  return price.toLocaleString("en-IN");
}

export function propertyToSpokenLine(p: Property): string {
  const bhkPart = p.bhk ? `${p.bhk} BHK ` : "";
  return `${p.title} - a ${bhkPart}${p.propertyType.replace("_", " ")} in ${p.locality}, ${p.city}, priced around ${formatPriceInr(
    p.priceInr
  )} rupees.`;
}

export function propertyToWhatsAppLine(p: Property): string {
  const bhkPart = p.bhk ? `${p.bhk} BHK · ` : "";
  return `*${p.title}*\n${bhkPart}${p.propertyType.replace("_", " ")} · ${p.locality}, ${p.city}\n₹ ${formatPriceInr(
    p.priceInr
  )} · ${p.areaSqft} sqft\n${p.listingUrl}`;
}
