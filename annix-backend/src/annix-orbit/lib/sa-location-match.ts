import { citiesForProvince } from "@annix/product-data/sa-market";

// A free-text job location belongs to a province if it names the province itself
// OR any city/district that sits inside it (Benoni -> Ekurhuleni -> Gauteng), so
// a location like "Benoni, Ekurhuleni" correctly matches a Gauteng filter even
// though the word "Gauteng" never appears in it. Returned terms are lowercased.
export function provinceMatchTerms(province: string): string[] {
  return [province, ...citiesForProvince(province)].map((term) => term.toLowerCase());
}

export function locationInProvince(locationHaystackLower: string, province: string): boolean {
  return provinceMatchTerms(province).some((term) => locationHaystackLower.includes(term));
}
