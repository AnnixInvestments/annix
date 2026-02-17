export interface MaterialGroupMapping {
  steelSpecPattern: string;
  ptRatingMaterialGroup: string;
  asmeGroup: string;
  description: string;
}

export const MATERIAL_GROUP_MAPPINGS: MaterialGroupMapping[] = [
  {
    steelSpecPattern: "A105",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Forged carbon steel flanges",
  },
  {
    steelSpecPattern: "A106",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Seamless carbon steel pipe (use A105 for flanges)",
  },
  {
    steelSpecPattern: "A53",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Welded/seamless carbon steel pipe (use A105 for flanges)",
  },
  {
    steelSpecPattern: "API 5L",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Line pipe (use A105 for flanges)",
  },
  {
    steelSpecPattern: "SABS 62",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "SA ERW pipe (use A105 for flanges)",
  },
  {
    steelSpecPattern: "SABS 719",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "SA large bore ERW pipe (use A105 for flanges)",
  },
  {
    steelSpecPattern: "A333",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Low-temp carbon steel (use A350 LF2 for flanges)",
  },
  {
    steelSpecPattern: "A335 P11",
    ptRatingMaterialGroup: "Low Alloy Steel F11 (Group 1.9)",
    asmeGroup: "1.9",
    description: "1.25Cr-0.5Mo alloy pipe",
  },
  {
    steelSpecPattern: "A335 P12",
    ptRatingMaterialGroup: "Low Alloy Steel F11 (Group 1.9)",
    asmeGroup: "1.9",
    description: "1Cr-0.5Mo alloy pipe",
  },
  {
    steelSpecPattern: "A335 P22",
    ptRatingMaterialGroup: "Low Alloy Steel F22 (Group 1.10)",
    asmeGroup: "1.10",
    description: "2.25Cr-1Mo alloy pipe",
  },
  {
    steelSpecPattern: "A335 P5",
    ptRatingMaterialGroup: "Low Alloy Steel F22 (Group 1.10)",
    asmeGroup: "1.10",
    description: "5Cr-0.5Mo alloy pipe",
  },
  {
    steelSpecPattern: "A335 P9",
    ptRatingMaterialGroup: "Low Alloy Steel F22 (Group 1.10)",
    asmeGroup: "1.10",
    description: "9Cr-1Mo alloy pipe",
  },
  {
    steelSpecPattern: "A335 P91",
    ptRatingMaterialGroup: "Low Alloy Steel F91 (Group 1.14)",
    asmeGroup: "1.14",
    description: "9Cr-1Mo-V advanced alloy pipe",
  },
  {
    steelSpecPattern: "TP304",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Austenitic SS 18Cr-8Ni",
  },
  {
    steelSpecPattern: "304L",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Low carbon austenitic SS",
  },
  {
    steelSpecPattern: "SS-304",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Stainless Steel 304 (code)",
  },
  {
    steelSpecPattern: "TP316",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "Austenitic SS 16Cr-12Ni-2Mo",
  },
  {
    steelSpecPattern: "316L",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "Low carbon molybdenum SS",
  },
  {
    steelSpecPattern: "SS-316",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "Stainless Steel 316 (code)",
  },
  {
    steelSpecPattern: "TP321",
    ptRatingMaterialGroup: "Stainless Steel 321 (Group 2.2)",
    asmeGroup: "2.2",
    description: "Ti-stabilized austenitic SS",
  },
  {
    steelSpecPattern: "TP347",
    ptRatingMaterialGroup: "Stainless Steel 347 (Group 2.2)",
    asmeGroup: "2.2",
    description: "Nb-stabilized austenitic SS",
  },
  {
    steelSpecPattern: "A790 S31803",
    ptRatingMaterialGroup: "Duplex Stainless Steel F51 (Group 3.2)",
    asmeGroup: "3.2",
    description: "Duplex 2205 (UNS S31803)",
  },
  {
    steelSpecPattern: "A790 S32205",
    ptRatingMaterialGroup: "Duplex Stainless Steel F51 (Group 3.2)",
    asmeGroup: "3.2",
    description: "Duplex 2205 (UNS S32205)",
  },
  {
    steelSpecPattern: "A790 S32750",
    ptRatingMaterialGroup: "Super Duplex Stainless Steel F55 (Group 3.3)",
    asmeGroup: "3.3",
    description: "Super Duplex 2507 (UNS S32750)",
  },
  {
    steelSpecPattern: "A790",
    ptRatingMaterialGroup: "Duplex Stainless Steel F51 (Group 3.2)",
    asmeGroup: "3.2",
    description: "Duplex stainless steel pipe",
  },
  {
    steelSpecPattern: "S31803",
    ptRatingMaterialGroup: "Duplex Stainless Steel F51 (Group 3.2)",
    asmeGroup: "3.2",
    description: "Duplex 2205 (UNS S31803)",
  },
  {
    steelSpecPattern: "S32205",
    ptRatingMaterialGroup: "Duplex Stainless Steel F51 (Group 3.2)",
    asmeGroup: "3.2",
    description: "Duplex 2205 (UNS S32205)",
  },
  {
    steelSpecPattern: "S32750",
    ptRatingMaterialGroup: "Super Duplex Stainless Steel F55 (Group 3.3)",
    asmeGroup: "3.3",
    description: "Super Duplex 2507 (UNS S32750)",
  },
  {
    steelSpecPattern: "Super Duplex",
    ptRatingMaterialGroup: "Super Duplex Stainless Steel F55 (Group 3.3)",
    asmeGroup: "3.3",
    description: "Super Duplex stainless steel",
  },
  {
    steelSpecPattern: "Duplex",
    ptRatingMaterialGroup: "Duplex Stainless Steel F51 (Group 3.2)",
    asmeGroup: "3.2",
    description: "Generic duplex stainless steel",
  },
  {
    steelSpecPattern: "EN 10216",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "European seamless steel tube",
  },
  {
    steelSpecPattern: "EN 10217",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "European welded steel tube",
  },
  {
    steelSpecPattern: "EN 10255",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "European ERW tube (similar to SABS 62)",
  },
  {
    steelSpecPattern: "A358",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Welded stainless steel pipe",
  },
  {
    steelSpecPattern: "A182 F5",
    ptRatingMaterialGroup: "Alloy Steel A182 F5 (Group 1.9)",
    asmeGroup: "1.9",
    description: "5Cr-0.5Mo forged flange",
  },
  {
    steelSpecPattern: "A182 F9",
    ptRatingMaterialGroup: "Alloy Steel A182 F9 (Group 1.10)",
    asmeGroup: "1.10",
    description: "9Cr-1Mo forged flange",
  },
  {
    steelSpecPattern: "A182 F11",
    ptRatingMaterialGroup: "Low Alloy Steel F11 (Group 1.9)",
    asmeGroup: "1.9",
    description: "1.25Cr-0.5Mo forged flange",
  },
  {
    steelSpecPattern: "A182 F22",
    ptRatingMaterialGroup: "Low Alloy Steel F22 (Group 1.10)",
    asmeGroup: "1.10",
    description: "2.25Cr-1Mo forged flange",
  },
  {
    steelSpecPattern: "A182 F91",
    ptRatingMaterialGroup: "Alloy Steel A182 F91 (Group 1.14)",
    asmeGroup: "1.14",
    description: "9Cr-1Mo-V forged flange",
  },
  {
    steelSpecPattern: "F304",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "304 SS forged flange",
  },
  {
    steelSpecPattern: "F316",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "316 SS forged flange",
  },
  {
    steelSpecPattern: "Incoloy 800",
    ptRatingMaterialGroup: "Incoloy 800/800H (Group 4.4)",
    asmeGroup: "4.4",
    description: "Nickel-iron-chromium alloy",
  },
  {
    steelSpecPattern: "Incoloy",
    ptRatingMaterialGroup: "Incoloy 800/800H (Group 4.4)",
    asmeGroup: "4.4",
    description: "Generic Incoloy alloy",
  },
  {
    steelSpecPattern: "Titanium Gr. 2",
    ptRatingMaterialGroup: "Titanium Grade 2 (Group 5.1)",
    asmeGroup: "5.1",
    description: "Commercially pure titanium",
  },
  {
    steelSpecPattern: "Titanium",
    ptRatingMaterialGroup: "Titanium Grade 2 (Group 5.1)",
    asmeGroup: "5.1",
    description: "Generic titanium (defaults to Gr. 2)",
  },
  {
    steelSpecPattern: "Inconel 625",
    ptRatingMaterialGroup: "Inconel 625 (Group 4.1)",
    asmeGroup: "4.1",
    description: "Nickel-chromium-molybdenum superalloy",
  },
  {
    steelSpecPattern: "Inconel",
    ptRatingMaterialGroup: "Inconel 625 (Group 4.1)",
    asmeGroup: "4.1",
    description: "Generic Inconel alloy",
  },
  {
    steelSpecPattern: "Hastelloy C-276",
    ptRatingMaterialGroup: "Hastelloy C276 (Group 4.3)",
    asmeGroup: "4.3",
    description: "Nickel-molybdenum-chromium superalloy",
  },
  {
    steelSpecPattern: "Hastelloy",
    ptRatingMaterialGroup: "Hastelloy C276 (Group 4.3)",
    asmeGroup: "4.3",
    description: "Corrosion-resistant nickel alloy",
  },
  {
    steelSpecPattern: "Monel 400",
    ptRatingMaterialGroup: "Monel 400 (Group 4.2)",
    asmeGroup: "4.2",
    description: "Nickel-copper alloy 67Ni-30Cu",
  },
  {
    steelSpecPattern: "Monel",
    ptRatingMaterialGroup: "Monel 400 (Group 4.2)",
    asmeGroup: "4.2",
    description: "Nickel-copper alloy",
  },
  {
    steelSpecPattern: "Carbon Steel",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Generic carbon steel",
  },
  {
    steelSpecPattern: "Stainless Steel",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Generic stainless steel (defaults to 304)",
  },
];

export const ptRatingMaterialGroup = (steelSpecName: string): string => {
  if (!steelSpecName) {
    return "Carbon Steel A105 (Group 1.1)";
  }

  const normalizedName = steelSpecName.toUpperCase();

  for (const mapping of MATERIAL_GROUP_MAPPINGS) {
    if (normalizedName.includes(mapping.steelSpecPattern.toUpperCase())) {
      return mapping.ptRatingMaterialGroup;
    }
  }

  if (normalizedName.includes("STAINLESS") || normalizedName.includes("SS")) {
    return "Stainless Steel 304 (Group 2.1)";
  }

  return "Carbon Steel A105 (Group 1.1)";
};

export const asmeGroupNumber = (steelSpecName: string): string => {
  if (!steelSpecName) {
    return "1.1";
  }

  const normalizedName = steelSpecName.toUpperCase();

  for (const mapping of MATERIAL_GROUP_MAPPINGS) {
    if (normalizedName.includes(mapping.steelSpecPattern.toUpperCase())) {
      return mapping.asmeGroup;
    }
  }

  return "1.1";
};

export const availablePtRatingGroups = (): string[] => {
  const uniqueGroups = new Set<string>();
  for (const mapping of MATERIAL_GROUP_MAPPINGS) {
    uniqueGroups.add(mapping.ptRatingMaterialGroup);
  }
  return Array.from(uniqueGroups);
};
