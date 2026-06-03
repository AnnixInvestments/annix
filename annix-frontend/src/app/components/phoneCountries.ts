export interface PhoneCountry {
  iso: string;
  name: string;
  dial: string;
}

export const DEFAULT_PHONE_COUNTRY_ISO = "ZA";

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "AO", name: "Angola", dial: "+244" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "AT", name: "Austria", dial: "+43" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "BE", name: "Belgium", dial: "+32" },
  { iso: "BW", name: "Botswana", dial: "+267" },
  { iso: "BR", name: "Brazil", dial: "+55" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "CD", name: "DR Congo", dial: "+243" },
  { iso: "DK", name: "Denmark", dial: "+45" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "SZ", name: "Eswatini", dial: "+268" },
  { iso: "ET", name: "Ethiopia", dial: "+251" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "GH", name: "Ghana", dial: "+233" },
  { iso: "GR", name: "Greece", dial: "+30" },
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "IL", name: "Israel", dial: "+972" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "LS", name: "Lesotho", dial: "+266" },
  { iso: "MG", name: "Madagascar", dial: "+261" },
  { iso: "MW", name: "Malawi", dial: "+265" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "MU", name: "Mauritius", dial: "+230" },
  { iso: "MX", name: "Mexico", dial: "+52" },
  { iso: "MA", name: "Morocco", dial: "+212" },
  { iso: "MZ", name: "Mozambique", dial: "+258" },
  { iso: "NA", name: "Namibia", dial: "+264" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "NO", name: "Norway", dial: "+47" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "PL", name: "Poland", dial: "+48" },
  { iso: "PT", name: "Portugal", dial: "+351" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "RU", name: "Russia", dial: "+7" },
  { iso: "RW", name: "Rwanda", dial: "+250" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "TZ", name: "Tanzania", dial: "+255" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "TR", name: "Turkey", dial: "+90" },
  { iso: "UG", name: "Uganda", dial: "+256" },
  { iso: "UA", name: "Ukraine", dial: "+380" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "VN", name: "Vietnam", dial: "+84" },
  { iso: "ZM", name: "Zambia", dial: "+260" },
  { iso: "ZW", name: "Zimbabwe", dial: "+263" },
];

export function phoneCountryFlag(iso: string): string {
  const upper = iso.toUpperCase();
  if (upper.length !== 2) return "";
  const first = upper.codePointAt(0);
  const second = upper.codePointAt(1);
  if (first === undefined || second === undefined) return "";
  return String.fromCodePoint(127397 + first, 127397 + second);
}

export function splitPhone(value: string): { iso: string; national: string } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { iso: DEFAULT_PHONE_COUNTRY_ISO, national: "" };
  }
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const match = sorted.find((country) => trimmed.startsWith(country.dial));
  if (match) {
    return { iso: match.iso, national: trimmed.slice(match.dial.length).trim() };
  }
  const withoutPlus = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  return { iso: DEFAULT_PHONE_COUNTRY_ISO, national: withoutPlus };
}

export function combinePhone(iso: string, national: string): string {
  const country = PHONE_COUNTRIES.find((entry) => entry.iso === iso);
  const dial = country ? country.dial : "+27";
  const digits = national.replace(/[^\d]/g, "");
  return digits.length > 0 ? `${dial}${digits}` : "";
}
