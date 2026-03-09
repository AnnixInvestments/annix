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

export interface SALocation {
  province: string;
  cities: Array<{
    name: string;
    suburbs: string[];
  }>;
}

export const SA_LOCATION_HIERARCHY: SALocation[] = [
  {
    province: "Gauteng",
    cities: [
      {
        name: "Johannesburg",
        suburbs: [
          "Sandton",
          "Rosebank",
          "Bryanston",
          "Midrand",
          "Randburg",
          "Roodepoort",
          "Fourways",
          "Centurion",
          "Kempton Park",
          "Edenvale",
          "Bedfordview",
          "Germiston",
          "Alberton",
          "Boksburg",
        ],
      },
      {
        name: "Pretoria",
        suburbs: [
          "Menlyn",
          "Hatfield",
          "Brooklyn",
          "Centurion",
          "Irene",
          "Montana",
          "Silverton",
          "Arcadia",
          "Lynnwood",
        ],
      },
      {
        name: "Ekurhuleni",
        suburbs: ["Benoni", "Springs", "Brakpan", "Boksburg", "Kempton Park"],
      },
    ],
  },
  {
    province: "Western Cape",
    cities: [
      {
        name: "Cape Town",
        suburbs: [
          "Century City",
          "Claremont",
          "Stellenbosch",
          "Bellville",
          "Paarl",
          "Tyger Valley",
          "Sea Point",
          "Gardens",
          "Woodstock",
          "Observatory",
        ],
      },
    ],
  },
  {
    province: "KwaZulu-Natal",
    cities: [
      {
        name: "Durban",
        suburbs: [
          "Umhlanga",
          "Ballito",
          "Pinetown",
          "Westville",
          "Hillcrest",
          "La Lucia",
          "Berea",
          "Amanzimtoti",
        ],
      },
      {
        name: "Pietermaritzburg",
        suburbs: ["Hilton", "Howick", "Scottsville"],
      },
    ],
  },
  {
    province: "Eastern Cape",
    cities: [
      {
        name: "Port Elizabeth",
        suburbs: ["Summerstrand", "Walmer", "Newton Park"],
      },
      {
        name: "East London",
        suburbs: ["Vincent", "Beacon Bay", "Gonubie"],
      },
    ],
  },
  {
    province: "Free State",
    cities: [
      {
        name: "Bloemfontein",
        suburbs: ["Westdene", "Langenhovenpark", "Bayswater"],
      },
    ],
  },
  {
    province: "Mpumalanga",
    cities: [
      {
        name: "Nelspruit",
        suburbs: ["White River", "Barberton"],
      },
      {
        name: "Witbank",
        suburbs: ["Middelburg", "Secunda"],
      },
    ],
  },
  {
    province: "Limpopo",
    cities: [
      {
        name: "Polokwane",
        suburbs: ["Bendor", "Flora Park"],
      },
    ],
  },
  {
    province: "North West",
    cities: [
      {
        name: "Rustenburg",
        suburbs: ["Phokeng", "Sun City"],
      },
    ],
  },
  {
    province: "Northern Cape",
    cities: [
      {
        name: "Kimberley",
        suburbs: ["Beaconsfield"],
      },
    ],
  },
];

export const SA_SALARY_RANGES = {
  currency: "ZAR",
  bands: [
    { label: "Entry Level", min: 0, max: 180000, monthly: "R0 - R15k" },
    { label: "Junior", min: 180000, max: 360000, monthly: "R15k - R30k" },
    { label: "Mid-Level", min: 360000, max: 600000, monthly: "R30k - R50k" },
    { label: "Senior", min: 600000, max: 960000, monthly: "R50k - R80k" },
    { label: "Lead / Principal", min: 960000, max: 1500000, monthly: "R80k - R125k" },
    { label: "Executive", min: 1500000, max: null, monthly: "R125k+" },
  ],
  costOfLivingIndex: {
    Johannesburg: 1.0,
    "Cape Town": 1.05,
    Durban: 0.9,
    Pretoria: 0.95,
    "Port Elizabeth": 0.82,
    Bloemfontein: 0.78,
    "East London": 0.8,
    Nelspruit: 0.85,
    Polokwane: 0.75,
    Rustenburg: 0.82,
    Pietermaritzburg: 0.85,
    Kimberley: 0.75,
  } as Record<string, number>,
} as const;

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

export const SA_SKILLS_TAXONOMY = {
  saqaQualifications: [
    "National Senior Certificate (Matric)",
    "National Certificate (Vocational) NCV",
    "National N Diploma",
    "National Diploma",
    "Advanced Diploma",
    "Bachelor of Technology (BTech)",
    "Bachelor of Engineering (BEng)",
    "Bachelor of Science (BSc)",
    "Bachelor of Commerce (BCom)",
    "Honours Degree",
    "Master of Engineering (MEng)",
    "Master of Science (MSc)",
    "Master of Business Administration (MBA)",
    "Doctor of Philosophy (PhD)",
  ],
  tradeCertifications: [
    "Red Seal Trade Certificate",
    "Electrician (Section 13)",
    "Millwright",
    "Fitter and Turner",
    "Boilermaker",
    "Welder (coded)",
    "Plumber",
    "Rigger",
    "Diesel Mechanic",
    "Auto Electrician",
    "Instrumentation Technician",
    "HVAC Technician",
    "Crane Operator",
    "Scaffolder",
    "Blaster / Painter (NACE/SSPC)",
  ],
  professionalRegistrations: [
    { code: "ECSA", name: "Engineering Council of South Africa", types: ["Pr Eng", "Pr Tech Eng", "Pr Cert Eng", "Pr Techni Eng"] },
    { code: "SACPCMP", name: "SA Council for the Project and Construction Management Professions", types: ["Pr CPM", "Pr CM", "Pr CHS"] },
    { code: "SACAP", name: "SA Council for the Architectural Profession", types: ["Pr Arch", "Sr Arch Tech", "Pr Sr Arch Tech"] },
    { code: "SACNASP", name: "SA Council for Natural Scientific Professions", types: ["Pr Sci Nat", "Cand Sci Nat"] },
    { code: "SAICA", name: "SA Institute of Chartered Accountants", types: ["CA(SA)"] },
    { code: "SAIPA", name: "SA Institute of Professional Accountants", types: ["AGA(SA)", "AT(SA)"] },
    { code: "HPCSA", name: "Health Professions Council of SA", types: ["Registered Practitioner"] },
    { code: "SANC", name: "SA Nursing Council", types: ["Registered Nurse", "Enrolled Nurse"] },
    { code: "CIDB", name: "Construction Industry Development Board", types: ["Grade 1-9 Contractor"] },
    { code: "SAIOSH", name: "SA Institute of Occupational Safety and Health", types: ["SHEPrac", "SHEMTEC", "SHEOHS"] },
  ],
  itCertifications: [
    "AWS Certified Solutions Architect",
    "Azure Administrator Associate",
    "Google Cloud Professional",
    "Certified Kubernetes Administrator",
    "CISSP",
    "CompTIA Security+",
    "CompTIA Network+",
    "CCNA (Cisco)",
    "ITIL Foundation",
    "PMP / PRINCE2",
    "Scrum Master (CSM/PSM)",
    "Certified Ethical Hacker (CEH)",
  ],
} as const;

export const SA_CV_LANGUAGES = ["English", "Afrikaans", "isiZulu", "isiXhosa", "Sesotho", "Setswana", "Sepedi", "Xitsonga", "siSwati", "Tshivenda", "isiNdebele"] as const;
