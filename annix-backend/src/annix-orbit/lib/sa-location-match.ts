// Re-exported from the comprehensive SA geography table. A free-text job location
// belongs to a province if it names the province, any of its districts, or any of
// its cities/towns (Benoni -> Ekurhuleni -> Gauteng). See ./sa-locations.
export { locationInProvince, provinceMatchTerms } from "./sa-locations";
