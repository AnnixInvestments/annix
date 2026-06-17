import type { mongo } from "mongoose";

const COLLECTION = "compound_data_sheet";

interface Spec {
  label: string;
  value: string;
  method?: string;
}

interface SeedSheet {
  slug: string;
  name: string;
  code: string;
  category: string;
  polymer: string;
  shoreHardness: string;
  colour: string;
  cureMethod: string;
  shortDescription: string;
  applications: string[];
  notRecommended: string;
  specs: Spec[];
  pdfUrl: string | null;
  pdfStatus: string;
  revision: string;
  metaTitle: string;
  metaDescription: string;
  sortOrder: number;
}

const NR_APPLICATIONS = [
  "Tank & vessel linings",
  "Chutes & launders",
  "Slurry pipelines & spools",
  "Pulleys & pump linings",
  "Cyclones & hydrocyclones",
];

const NR_NOT_RECOMMENDED = "Oils, acids, hydrocarbon solvents and strong oxidising agents.";

const tempSpec: Spec = { label: "Max operating temperature", value: "70 °C (not continuous)" };

const SHEETS: SeedSheet[] = [
  {
    slug: "au-38-shore-black-steam-cured",
    name: "AU 38 Shore Black Steam-Cured Natural Rubber Lining",
    code: "AU-A38-BSC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber",
    shoreHardness: "38 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A soft, high-resilience 38 shore natural rubber lining engineered for wet fine-slurry abrasion. Its high elongation and low abrasion loss make it a premium general-purpose mining lining for tanks, chutes and slurry pipelines.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "38 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "20 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "600%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.04 ±0.02", method: "ISO 2781-2008" },
      { label: "Rebound resilience", value: "74%", method: "ISO 4662-2017" },
      { label: "Abrasion loss", value: "95 mm³ max", method: "BS 903 Part A8" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-38-shore-black-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Rev 5 · Sep 2025",
    metaTitle: "AU 38 Shore Black Natural Rubber Lining | Data Sheet | AU Industries",
    metaDescription:
      "Technical data sheet for AU 38 shore black steam-cured natural rubber lining — soft, high-resilience wet-slurry abrasion lining for mining tanks, chutes and pipelines. Made in South Africa.",
    sortOrder: 10,
  },
  {
    slug: "au-40-shore-black-steam-cured",
    name: "AU 40 Shore Black Steam-Cured Natural Rubber Lining",
    code: "AU-A40-BSC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber",
    shoreHardness: "40 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "The workhorse 40 shore black natural rubber lining — an excellent general-purpose wet-slurry abrasion lining for tanks, chutes, launders, pulleys, pipes and hoses across mining and process plants.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "40 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "18 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "550%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.08 ±0.02", method: "ISO 2781-2008" },
      { label: "Rebound resilience", value: "70%", method: "ISO 4662-2017" },
      { label: "Abrasion loss", value: "150 mm³", method: "BS 903 Part A8" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-40-shore-black-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Jun 2025",
    metaTitle: "AU 40 Shore Black Natural Rubber Lining | Data Sheet | AU Industries",
    metaDescription:
      "Technical data sheet for AU 40 shore black steam-cured natural rubber — the general-purpose wet-slurry abrasion lining for mining tanks, chutes and pipework. Made in South Africa.",
    sortOrder: 20,
  },
  {
    slug: "au-40-shore-black-pre-cured",
    name: "AU 40 Shore Black Pre-Cured Natural Rubber Lining",
    code: "AU-A40-BPC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber",
    shoreHardness: "40 ±5 IRHD",
    colour: "Black",
    cureMethod: "Pre-Cured",
    shortDescription:
      "Pre-cured 40 shore black natural rubber sheet for on-site and cold-bond lining where autoclave curing is not practical — ideal for field repairs and large vessels lined in place.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "40 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "18 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "550%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.08 ±0.02", method: "ISO 2781-2008" },
      { label: "Rebound resilience", value: "70%", method: "ISO 4662-2017" },
      { label: "Abrasion loss", value: "150 mm³", method: "BS 903 Part A8" },
      tempSpec,
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Aug 2025",
    metaTitle: "AU 40 Shore Black Pre-Cured Natural Rubber Lining | AU Industries",
    metaDescription:
      "AU 40 shore black pre-cured natural rubber lining for cold-bond and on-site application — general-purpose wet-slurry abrasion protection. Made in South Africa.",
    sortOrder: 30,
  },
  {
    slug: "au-60-shore-black-steam-cured",
    name: "AU 60 Shore Black Steam-Cured Natural Rubber Lining",
    code: "AU-A60-BSC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber (silica-reinforced)",
    shoreHardness: "60 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A harder, silica-reinforced 60 shore black natural rubber lining providing superior cut and tear resistance — built for coarse, sharp-particle slurries in chutes, cyclones and transfer points.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber (silica-reinforced)" },
      { label: "Shore hardness", value: "60 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "18 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "400% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.08 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-60-shore-black-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Rev 2 · Aug 2025",
    metaTitle: "AU 60 Shore Black Natural Rubber Lining | Data Sheet | AU Industries",
    metaDescription:
      "Technical data sheet for AU 60 shore black silica-reinforced natural rubber lining — cut and tear resistant protection for coarse, sharp-particle mining slurries. Made in South Africa.",
    sortOrder: 40,
  },
  {
    slug: "au-60-shore-black-pre-cured",
    name: "AU 60 Shore Black Pre-Cured Natural Rubber Lining",
    code: "AU-A60-BPC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber (silica-reinforced)",
    shoreHardness: "60 ±5 IRHD",
    colour: "Black",
    cureMethod: "Pre-Cured",
    shortDescription:
      "Pre-cured 60 shore black silica-reinforced natural rubber for cold-bond lining of coarse-slurry equipment — cut and tear resistance where on-site application is required.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber (silica-reinforced)" },
      { label: "Shore hardness", value: "60 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "18 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "400% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.08 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "May 2025",
    metaTitle: "AU 60 Shore Black Pre-Cured Natural Rubber Lining | AU Industries",
    metaDescription:
      "AU 60 shore black pre-cured silica-reinforced natural rubber lining for cold-bond application — cut and tear resistance for coarse mining slurries. Made in South Africa.",
    sortOrder: 50,
  },
  {
    slug: "au-40-shore-red-steam-cured",
    name: "AU 40 Shore Red Steam-Cured Natural Rubber Lining",
    code: "AU-A40-RSC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber",
    shoreHardness: "40 ±5 IRHD",
    colour: "Red",
    cureMethod: "Steam-Cured",
    shortDescription:
      "The red-pigmented 40 shore steam-cured natural rubber lining — the same proven general-purpose wet-slurry abrasion performance with a high-visibility wear indicator.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "40 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "20 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "600% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.05 ±0.02", method: "ISO 2781-2008" },
      { label: "Rebound resilience", value: "74–96%", method: "ISO 4662-2017" },
      { label: "Abrasion loss", value: "95 mm³ max", method: "BS 903 Part A8" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-40-shore-red-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Rev 3 · Jul 2025",
    metaTitle: "AU 40 Shore Red Natural Rubber Lining | Data Sheet | AU Industries",
    metaDescription:
      "Technical data sheet for AU 40 shore red steam-cured natural rubber lining — general-purpose wet-slurry abrasion protection with a high-visibility wear indicator. Made in South Africa.",
    sortOrder: 60,
  },
  {
    slug: "au-40-shore-red-pre-cured",
    name: "AU 40 Shore Red Pre-Cured Natural Rubber Lining",
    code: "AU-A40-RPC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber",
    shoreHardness: "40 ±5 IRHD",
    colour: "Red",
    cureMethod: "Pre-Cured",
    shortDescription:
      "Pre-cured 40 shore red natural rubber sheet for cold-bond and on-site lining — general-purpose wet-slurry abrasion protection with a high-visibility wear indicator.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "40 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "20 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "600% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.05 ±0.02", method: "ISO 2781-2008" },
      { label: "Rebound resilience", value: "74–96%", method: "ISO 4662-2017" },
      { label: "Abrasion loss", value: "95 mm³ max", method: "BS 903 Part A8" },
      tempSpec,
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "May 2025",
    metaTitle: "AU 40 Shore Red Pre-Cured Natural Rubber Lining | AU Industries",
    metaDescription:
      "AU 40 shore red pre-cured natural rubber lining for cold-bond and on-site application — general-purpose wet-slurry abrasion protection. Made in South Africa.",
    sortOrder: 70,
  },
  {
    slug: "au-60-shore-red-steam-cured",
    name: "AU 60 Shore Red Steam-Cured Natural Rubber Lining",
    code: "AU-A60-RSC",
    category: "Natural Rubber Lining",
    polymer: "Natural Rubber (silica-reinforced)",
    shoreHardness: "60 ±5 IRHD",
    colour: "Red",
    cureMethod: "Steam-Cured",
    shortDescription:
      "Silica-reinforced 60 shore red natural rubber lining for coarse, sharp-particle slurries — high resilience transfers impact energy back into the material flow, reducing heat build-up and extending wear life.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber (silica-reinforced)" },
      { label: "Shore hardness", value: "60 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "18 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "400% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.14 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-60-shore-red-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Rev 2 · Nov 2024",
    metaTitle: "AU 60 Shore Red Natural Rubber Lining | Data Sheet | AU Industries",
    metaDescription:
      "Technical data sheet for AU 60 shore red silica-reinforced natural rubber lining — high-resilience cut and impact resistance for coarse mining slurries. Made in South Africa.",
    sortOrder: 80,
  },
  {
    slug: "au-premium-38-shore-pink",
    name: "AU Premium 38 Shore Pink Natural Rubber Lining",
    code: "AUP-A38-PSC",
    category: "Premium Silica-Reinforced",
    polymer: "Natural Rubber",
    shoreHardness: "38 ±5 IRHD",
    colour: "Pink",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A premium 38 shore natural rubber lining with very high elongation and resilience for the most demanding wet fine-slurry abrasion duties — a top-tier general-purpose mining lining.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "38 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "20 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "650%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "0.98 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-premium-38-shore-pink.pdf",
    pdfStatus: "available",
    revision: "Mar 2024",
    metaTitle: "AU Premium 38 Shore Pink Natural Rubber Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU Premium 38 shore pink natural rubber lining — high-elongation, high-resilience wet fine-slurry abrasion protection for mining. Made in South Africa.",
    sortOrder: 90,
  },
  {
    slug: "au-premium-38-shore-red",
    name: "AU Premium 38 Shore Red Natural Rubber Lining",
    code: "AUP-A38-RSC",
    category: "Premium Silica-Reinforced",
    polymer: "Natural Rubber",
    shoreHardness: "38 ±5 IRHD",
    colour: "Red",
    cureMethod: "Steam-Cured",
    shortDescription:
      "Premium 38 shore red natural rubber lining — high-elongation, high-resilience wet fine-slurry abrasion protection with a high-visibility wear indicator.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "38 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "20 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "650%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "0.98 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-premium-38-shore-red.pdf",
    pdfStatus: "available",
    revision: "Mar 2024",
    metaTitle: "AU Premium 38 Shore Red Natural Rubber Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU Premium 38 shore red natural rubber lining — high-elongation wet fine-slurry abrasion protection with a wear indicator. Made in South Africa.",
    sortOrder: 100,
  },
  {
    slug: "au-premium-60-shore-pink",
    name: "AU Premium 60 Shore Pink Natural Rubber Lining",
    code: "AUP-A60-PSC",
    category: "Premium Silica-Reinforced",
    polymer: "Natural Rubber (silica-reinforced)",
    shoreHardness: "60 ±5 IRHD",
    colour: "Pink",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A high-quality, silica-reinforced 60 shore natural rubber engineered for excellent resilience alongside superior cut, tear and abrasion resistance — outstanding for handling coarse materials where build-up prevention is critical.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber (silica-reinforced)" },
      { label: "Shore hardness", value: "60 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "21 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "690% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.14 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Jan 2025",
    metaTitle: "AU Premium 60 Shore Pink Natural Rubber Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU Premium 60 shore pink silica-reinforced natural rubber — superior cut, tear and abrasion resistance for coarse mining materials. Made in South Africa.",
    sortOrder: 110,
  },
  {
    slug: "au-premium-60-shore-red",
    name: "AU Premium 60 Shore Red Natural Rubber Lining",
    code: "AU-PA60-RSC",
    category: "Premium Silica-Reinforced",
    polymer: "Natural Rubber (silica-reinforced)",
    shoreHardness: "60 ±5 IRHD",
    colour: "Red",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A high-quality, silica-reinforced 60 shore red natural rubber delivering excellent resilience with superior cut, tear and abrasion resistance — outstanding for coarse materials where build-up prevention is required.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber (silica-reinforced)" },
      { label: "Shore hardness", value: "60 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "21 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "690% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.14 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Jan 2025",
    metaTitle: "AU Premium 60 Shore Red Natural Rubber Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU Premium 60 shore red silica-reinforced natural rubber — superior cut, tear and abrasion resistance for coarse mining materials. Made in South Africa.",
    sortOrder: 120,
  },
  {
    slug: "au-50-shore-bromobutyl-steam-cured",
    name: "AU 50 Shore Bromobutyl Black Steam-Cured Lining",
    code: "AU-C50-BBSC",
    category: "Specialty Compounds",
    polymer: "Bromobutyl (BIIR)",
    shoreHardness: "50 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A 50 shore bromobutyl lining offering excellent resistance to mineral acids, salts, aqueous and polar solutions, with the low gas permeability butyl compounds are known for — the choice for acid-service tanks and pipework.",
    applications: [
      "Acid-service tank linings",
      "Pickling & process vessels",
      "Pipes & launders in corrosive duty",
      "Pulleys & hoses",
    ],
    notRecommended:
      "Oils, greases and some solvents. Has limited abrasion resistance — confirm chemical compatibility before lining.",
    specs: [
      { label: "Polymer", value: "Bromobutyl (BIIR)" },
      { label: "Shore hardness", value: "50 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "7 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "500%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.16 ±0.02", method: "ISO 2781-2008" },
      { label: "Max operating temperature", value: "120 °C (not continuous)" },
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Mar 2024",
    metaTitle: "AU 50 Shore Bromobutyl Acid-Resistant Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU 50 shore bromobutyl lining — excellent resistance to mineral acids, salts and aqueous solutions for acid-service tanks and pipework. Made in South Africa.",
    sortOrder: 130,
  },
  {
    slug: "au-50-shore-neoprene-steam-cured",
    name: "AU 50 Shore Neoprene Black Steam-Cured Lining",
    code: "NEOB50-BSC",
    category: "Specialty Compounds",
    polymer: "Neoprene (Chloroprene / CR)",
    shoreHardness: "50 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A 50 shore neoprene lining with good friction and self-extinguishing characteristics, plus strong resistance to oils, fuels, ozone, UV and abrasion — a versatile lining for demanding environments.",
    applications: [
      "Tank & chute linings",
      "Launders & pulleys",
      "Pipes & hoses",
      "Oil- & weather-exposed duty",
    ],
    notRecommended:
      "Breathable applications (traps heat/moisture), strong acids, ketones, esters or very aggressive chemicals.",
    specs: [
      { label: "Polymer", value: "Neoprene (Chloroprene / CR)" },
      { label: "Shore hardness", value: "50 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "14 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "500% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.40 ±0.03", method: "ISO 2781-2008" },
      { label: "Rebound resilience", value: "40%", method: "ISO 4662-2017" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/au-50-shore-neoprene-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Rev 1 · Nov 2025",
    metaTitle: "AU 50 Shore Neoprene Lining | Data Sheet | AU Industries",
    metaDescription:
      "Technical data sheet for AU 50 shore neoprene lining — oil, fuel, ozone and UV resistance with good friction and self-extinguishing properties. Made in South Africa.",
    sortOrder: 140,
  },
  {
    slug: "au-50-shore-nitrile-butadiene-steam-cured",
    name: "AU 50 Shore Nitrile-Butadiene (NBR-BR) Black Steam-Cured Lining",
    code: "AU-C50-NBR-BR",
    category: "Specialty Compounds",
    polymer: "Nitrile-Butadiene (NBR-BR)",
    shoreHardness: "50 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A 50 shore nitrile rubber blended with butadiene for oil, fuel and hydrocarbon resistance plus good abrasion resistance — engineered for slurry lines that also carry oils, fuels and hydrocarbons.",
    applications: [
      "Oil- & hydrocarbon-bearing slurry lines",
      "Fuel-contact tank linings",
      "Chutes & launders",
      "Pipes & hoses",
    ],
    notRecommended: "Phenols, ketones, carboxylic acids or nitrogen derivatives.",
    specs: [
      { label: "Polymer", value: "Nitrile-Butadiene (NBR-BR)" },
      { label: "Shore hardness", value: "50 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "7 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "350% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.075 ±0.02", method: "ISO 2781-2008" },
      { label: "Abrasion resistance", value: "180 mm³ max", method: "SANS 4649" },
      { label: "Max operating temperature", value: "120 °C (not continuous)" },
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Rev 2 · Jun 2025",
    metaTitle: "AU 50 Shore Nitrile-Butadiene (NBR) Oil-Resistant Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU 50 shore nitrile-butadiene (NBR-BR) lining — oil, fuel and hydrocarbon resistance with good abrasion resistance for oily slurry lines. Made in South Africa.",
    sortOrder: 150,
  },
  {
    slug: "au-60-shore-nitrile-steam-cured",
    name: "AU 60 Shore Nitrile (NBR) Black Steam-Cured Lining",
    code: "AU-C60-NBSC",
    category: "Specialty Compounds",
    polymer: "Nitrile (NBR)",
    shoreHardness: "55 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A harder nitrile (NBR) lining where oil, fuel and hydrocarbon resistance is the priority — for tanks, chutes, pipes and hoses in hydrocarbon-contact service.",
    applications: [
      "Oil- & fuel-contact tank linings",
      "Hydrocarbon process equipment",
      "Chutes & launders",
      "Pipes & hoses",
    ],
    notRecommended: "Phenols, ketones, carboxylic acids or nitrogen derivatives.",
    specs: [
      { label: "Polymer", value: "Nitrile (NBR)" },
      { label: "Shore hardness", value: "55 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "10 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "400% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.21 ±0.02", method: "ISO 2781-2008" },
      { label: "Max operating temperature", value: "120 °C (not continuous)" },
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Rev 1 · Aug 2024",
    metaTitle: "AU 60 Shore Nitrile (NBR) Oil-Resistant Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU nitrile (NBR) lining — oil, fuel and hydrocarbon resistance for tanks, chutes and pipework in hydrocarbon service. Made in South Africa.",
    sortOrder: 160,
  },
  {
    slug: "au-60-shore-nitrile-butadiene-steam-cured",
    name: "AU 60 Shore Nitrile-Butadiene (NBR-BR) Black Steam-Cured Lining",
    code: "AU-C60-NBR-BR",
    category: "Specialty Compounds",
    polymer: "Nitrile-Butadiene (NBR-BR)",
    shoreHardness: "60 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "A 60 shore nitrile rubber blended with butadiene for oil, fuel and hydrocarbon resistance plus enhanced abrasion resistance — for harder-wearing oily slurry duty.",
    applications: [
      "Oil- & hydrocarbon-bearing slurry lines",
      "Fuel-contact tank linings",
      "Chutes & launders",
      "Pipes & hoses",
    ],
    notRecommended: "Phenols, ketones, carboxylic acids or nitrogen derivatives.",
    specs: [
      { label: "Polymer", value: "Nitrile-Butadiene (NBR-BR)" },
      { label: "Shore hardness", value: "60 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "12 MPa min", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "350% min", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.19 ±0.02", method: "ISO 2781-2008" },
      { label: "Abrasion resistance", value: "180 mm³ max", method: "SANS 4649" },
      { label: "Max operating temperature", value: "120 °C (not continuous)" },
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Rev 1 · Sep 2024",
    metaTitle: "AU 60 Shore Nitrile-Butadiene (NBR) Oil-Resistant Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU 60 shore nitrile-butadiene (NBR-BR) lining — oil, fuel and hydrocarbon resistance with enhanced abrasion resistance. Made in South Africa.",
    sortOrder: 170,
  },
  {
    slug: "au-tigeye-38-shore-red",
    name: "AU TigEye 38 Shore Red Natural Rubber Lining",
    code: "AU-TE38-RSC",
    category: "Branded Grades",
    polymer: "Natural Rubber",
    shoreHardness: "38 ±5 IRHD",
    colour: "Red",
    cureMethod: "Steam-Cured",
    shortDescription:
      "AU TigEye is a 38 shore red natural rubber lining tuned for general-purpose wet-slurry abrasion with continuous-service capability at temperature — a high-visibility branded mining lining.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "38 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "20 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "650%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.01 ±0.02", method: "ISO 2781-2008" },
      { label: "Max operating temperature", value: "70 °C (continuous)" },
    ],
    pdfUrl: null,
    pdfStatus: "coming_soon",
    revision: "Mar 2024",
    metaTitle: "AU TigEye 38 Shore Red Natural Rubber Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU TigEye 38 shore red natural rubber lining — general-purpose wet-slurry abrasion protection with continuous-service capability. Made in South Africa.",
    sortOrder: 180,
  },
  {
    slug: "cs-40-shore-black-steam-cured",
    name: "AU CS 40 Shore Black Steam-Cured Natural Rubber Lining",
    code: "CS-A40-BSC",
    category: "Branded Grades",
    polymer: "Natural Rubber",
    shoreHardness: "40 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "AU CS is a 40 shore black natural rubber lining for general-purpose wet-slurry abrasion — a dependable workhorse grade for tanks, chutes and pipework.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "40 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "18 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "550%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.08 ±0.02", method: "ISO 2781-2008" },
      { label: "Rebound resilience", value: "70%", method: "ISO 4662-2017" },
      { label: "Abrasion loss", value: "150 mm³", method: "BS 903 Part A8" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/cs-40-shore-black-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Jun 2025",
    metaTitle: "AU CS 40 Shore Black Natural Rubber Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU CS 40 shore black steam-cured natural rubber lining — general-purpose wet-slurry abrasion protection for mining. Made in South Africa.",
    sortOrder: 190,
  },
  {
    slug: "slurryshield-40-shore-black-steam-cured",
    name: "AU SlurryShield 40 Shore Black Steam-Cured Natural Rubber Lining",
    code: "SS40B",
    category: "Branded Grades",
    polymer: "Natural Rubber",
    shoreHardness: "40 ±5 IRHD",
    colour: "Black",
    cureMethod: "Steam-Cured",
    shortDescription:
      "AU SlurryShield is a 40 shore black natural rubber lining built for wet-slurry abrasion — purpose-named protection for slurry pipelines, tanks and chutes.",
    applications: NR_APPLICATIONS,
    notRecommended: NR_NOT_RECOMMENDED,
    specs: [
      { label: "Polymer", value: "Natural Rubber" },
      { label: "Shore hardness", value: "40 ±5 IRHD", method: "ISO 48-2010" },
      { label: "Tensile strength", value: "18 MPa", method: "ISO 37-2011" },
      { label: "Elongation at break", value: "560%", method: "ISO 37-2011" },
      { label: "Specific gravity", value: "1.04 ±0.02", method: "ISO 2781-2008" },
      tempSpec,
    ],
    pdfUrl: "/au-industries/datasheets/slurryshield-40-shore-black-steam-cured.pdf",
    pdfStatus: "available",
    revision: "Rev 1 · Oct 2025",
    metaTitle: "AU SlurryShield 40 Shore Black Natural Rubber Lining | AU Industries",
    metaDescription:
      "Technical data sheet for AU SlurryShield 40 shore black steam-cured natural rubber lining — wet-slurry abrasion protection for slurry pipelines and tanks. Made in South Africa.",
    sortOrder: 200,
  },
];

type SheetDoc = SeedSheet & {
  _id: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection<SheetDoc>(COLLECTION);
  const now = new Date();

  for (const sheet of SHEETS) {
    await collection.updateOne(
      { _id: sheet.slug },
      {
        $set: {
          slug: sheet.slug,
          name: sheet.name,
          code: sheet.code,
          category: sheet.category,
          polymer: sheet.polymer,
          shoreHardness: sheet.shoreHardness,
          colour: sheet.colour,
          cureMethod: sheet.cureMethod,
          shortDescription: sheet.shortDescription,
          applications: sheet.applications,
          notRecommended: sheet.notRecommended,
          specs: sheet.specs,
          pdfUrl: sheet.pdfUrl,
          pdfStatus: sheet.pdfStatus,
          revision: sheet.revision,
          metaTitle: sheet.metaTitle,
          metaDescription: sheet.metaDescription,
          sortOrder: sheet.sortOrder,
          isPublished: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex({ isPublished: 1, sortOrder: 1 });

  console.warn(`[migration] Seeded ${SHEETS.length} AU compound data sheet(s).`);
};

export const down = async (db: mongo.Db): Promise<void> => {
  const slugs = SHEETS.map((sheet) => sheet.slug);
  await db.collection(COLLECTION).deleteMany({ slug: { $in: slugs } });
};
