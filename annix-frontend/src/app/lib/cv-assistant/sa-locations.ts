export interface SALocation {
  province: string;
  cities: string[];
}

export const SA_LOCATION_HIERARCHY: SALocation[] = [
  {
    province: "Gauteng",
    cities: ["Johannesburg", "Pretoria", "Ekurhuleni", "Centurion", "Sandton", "Midrand"],
  },
  {
    province: "Western Cape",
    cities: ["Cape Town", "Stellenbosch", "Paarl", "Bellville"],
  },
  {
    province: "KwaZulu-Natal",
    cities: ["Durban", "Pietermaritzburg", "Umhlanga", "Ballito", "Pinetown"],
  },
  {
    province: "Eastern Cape",
    cities: ["Port Elizabeth", "East London", "Mthatha"],
  },
  {
    province: "Free State",
    cities: ["Bloemfontein", "Welkom"],
  },
  {
    province: "Mpumalanga",
    cities: ["Nelspruit", "Witbank", "Middelburg", "Secunda"],
  },
  {
    province: "Limpopo",
    cities: ["Polokwane", "Tzaneen", "Mokopane"],
  },
  {
    province: "North West",
    cities: ["Rustenburg", "Klerksdorp", "Mahikeng", "Kathu"],
  },
  {
    province: "Northern Cape",
    cities: ["Kimberley", "Upington", "Springbok"],
  },
];

export const SA_PROVINCES = SA_LOCATION_HIERARCHY.map((p) => p.province);

export function citiesForProvince(province: string | null): string[] {
  if (!province) return [];
  const found = SA_LOCATION_HIERARCHY.find((p) => p.province === province);
  return found ? found.cities : [];
}
