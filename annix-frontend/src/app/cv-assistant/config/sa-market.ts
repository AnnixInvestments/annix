export const SA_ADZUNA_CATEGORIES = [
  { tag: "it-jobs", label: "IT / Software Development" },
  { tag: "engineering-jobs", label: "Engineering" },
  { tag: "construction-jobs", label: "Construction" },
  { tag: "manufacturing-jobs", label: "Manufacturing" },
  { tag: "accounting-finance-jobs", label: "Accounting & Finance" },
  { tag: "healthcare-nursing-jobs", label: "Healthcare & Nursing" },
  { tag: "logistics-warehouse-jobs", label: "Logistics & Warehousing" },
  { tag: "admin-jobs", label: "Admin & Office" },
  { tag: "trade-construction-jobs", label: "Trade & Skilled Labour" },
  { tag: "energy-oil-gas-jobs", label: "Energy, Oil & Gas" },
] as const;

export const SA_PROVINCES = [
  {
    province: "Gauteng",
    cities: ["Johannesburg", "Pretoria", "Ekurhuleni", "Midrand", "Centurion"],
  },
  {
    province: "Western Cape",
    cities: ["Cape Town", "Stellenbosch", "Paarl"],
  },
  {
    province: "KwaZulu-Natal",
    cities: ["Durban", "Pietermaritzburg", "Ballito"],
  },
  {
    province: "Eastern Cape",
    cities: ["Port Elizabeth", "East London"],
  },
  {
    province: "Free State",
    cities: ["Bloemfontein"],
  },
  {
    province: "Mpumalanga",
    cities: ["Nelspruit", "Witbank"],
  },
  {
    province: "Limpopo",
    cities: ["Polokwane"],
  },
  {
    province: "North West",
    cities: ["Rustenburg"],
  },
  {
    province: "Northern Cape",
    cities: ["Kimberley"],
  },
] as const;

export const BEE_LEVELS = [
  { value: 1, label: "Level 1 (135% recognition)" },
  { value: 2, label: "Level 2 (125% recognition)" },
  { value: 3, label: "Level 3 (110% recognition)" },
  { value: 4, label: "Level 4 (100% recognition)" },
  { value: 5, label: "Level 5 (80% recognition)" },
  { value: 6, label: "Level 6 (60% recognition)" },
  { value: 7, label: "Level 7 (50% recognition)" },
  { value: 8, label: "Level 8 (10% recognition)" },
] as const;

export const SA_PROFESSIONAL_REGISTRATIONS = [
  {
    code: "ECSA",
    name: "Engineering Council of SA",
    types: ["Pr Eng", "Pr Tech Eng", "Pr Cert Eng"],
  },
  {
    code: "SACPCMP",
    name: "SA Council for Project & Construction Management",
    types: ["Pr CPM", "Pr CM", "Pr CHS"],
  },
  {
    code: "SACAP",
    name: "SA Council for the Architectural Profession",
    types: ["Pr Arch", "Sr Arch Tech"],
  },
  {
    code: "SACNASP",
    name: "SA Council for Natural Scientific Professions",
    types: ["Pr Sci Nat", "Cand Sci Nat"],
  },
  { code: "SAICA", name: "SA Institute of Chartered Accountants", types: ["CA(SA)"] },
  { code: "SAIPA", name: "SA Institute of Professional Accountants", types: ["AGA(SA)", "AT(SA)"] },
  { code: "HPCSA", name: "Health Professions Council of SA", types: ["Registered Practitioner"] },
  { code: "SANC", name: "SA Nursing Council", types: ["Registered Nurse", "Enrolled Nurse"] },
  {
    code: "CIDB",
    name: "Construction Industry Development Board",
    types: ["Grade 1-9 Contractor"],
  },
  {
    code: "SAIOSH",
    name: "SA Institute of Occupational Safety and Health",
    types: ["SHEPrac", "SHEMTEC"],
  },
] as const;

export const SA_SALARY_BANDS = [
  { label: "Entry Level", monthly: "R0 - R15k" },
  { label: "Junior", monthly: "R15k - R30k" },
  { label: "Mid-Level", monthly: "R30k - R50k" },
  { label: "Senior", monthly: "R50k - R80k" },
  { label: "Lead / Principal", monthly: "R80k - R125k" },
  { label: "Executive", monthly: "R125k+" },
] as const;
