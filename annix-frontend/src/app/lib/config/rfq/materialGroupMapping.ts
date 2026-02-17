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
    steelSpecPattern: "A333 Gr. 3",
    ptRatingMaterialGroup: "Nickel Alloy Steel LF3 (Group 9A)",
    asmeGroup: "9A",
    description: "3.5% Nickel low-temp pipe (use A350 LF3 for flanges). P-No. 9A.",
  },
  {
    steelSpecPattern: "A333 Gr. 4",
    ptRatingMaterialGroup: "Nickel Alloy Steel LF3 (Group 9A)",
    asmeGroup: "9A",
    description: "0.75% Nickel low-temp pipe (use A350 LF2 for flanges). P-No. 9A.",
  },
  {
    steelSpecPattern: "A333 Gr. 7",
    ptRatingMaterialGroup: "Nickel Alloy Steel LF3 (Group 9A)",
    asmeGroup: "9A",
    description: "2.5% Nickel low-temp pipe (use A350 LF3 for flanges). P-No. 9A.",
  },
  {
    steelSpecPattern: "A333 Gr. 5",
    ptRatingMaterialGroup: "9% Nickel Steel (Group 11A)",
    asmeGroup: "11A",
    description: "9% Nickel cryogenic pipe. P-No. 11A.",
  },
  {
    steelSpecPattern: "A333 Gr. 8",
    ptRatingMaterialGroup: "9% Nickel Steel (Group 11A)",
    asmeGroup: "11A",
    description: "9% Nickel cryogenic pipe. P-No. 11A.",
  },
  {
    steelSpecPattern: "A333 Gr. 6",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Low-temp carbon steel (use A350 LF2 for flanges). P-No. 1.",
  },
  {
    steelSpecPattern: "A333 Gr. 1",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Low-temp carbon steel (use A350 LF2 for flanges). P-No. 1.",
  },
  {
    steelSpecPattern: "A333",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description:
      "Low-temp carbon steel (use A350 LF2 for flanges). Specify grade for nickel alloy steels.",
  },
  {
    steelSpecPattern: "A350 LF3",
    ptRatingMaterialGroup: "Nickel Alloy Steel LF3 (Group 9A)",
    asmeGroup: "9A",
    description: "3.5% Nickel forged flanges for A333 Gr 3/7. P-No. 9A.",
  },
  {
    steelSpecPattern: "A350 LF2",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Low-temp carbon steel forged flanges. P-No. 1.",
  },
  {
    steelSpecPattern: "A420 WPL3",
    ptRatingMaterialGroup: "Nickel Alloy Steel LF3 (Group 9A)",
    asmeGroup: "9A",
    description: "3.5% Nickel wrought fittings for A333 Gr 3. P-No. 9A.",
  },
  {
    steelSpecPattern: "A420 WPL6",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Low-temp carbon steel wrought fittings. P-No. 1.",
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
    steelSpecPattern: "TP405",
    ptRatingMaterialGroup: "Ferritic Stainless Steel (Group 7.1)",
    asmeGroup: "7.1",
    description: "12Cr ferritic stainless steel",
  },
  {
    steelSpecPattern: "TP409",
    ptRatingMaterialGroup: "Ferritic Stainless Steel (Group 7.1)",
    asmeGroup: "7.1",
    description: "11Cr-Ti ferritic stainless steel",
  },
  {
    steelSpecPattern: "TP430",
    ptRatingMaterialGroup: "Ferritic Stainless Steel (Group 7.1)",
    asmeGroup: "7.1",
    description: "17Cr ferritic stainless steel",
  },
  {
    steelSpecPattern: "TP434",
    ptRatingMaterialGroup: "Ferritic Stainless Steel (Group 7.1)",
    asmeGroup: "7.1",
    description: "17Cr-1Mo ferritic stainless steel",
  },
  {
    steelSpecPattern: "TP410",
    ptRatingMaterialGroup: "Martensitic Stainless Steel (Group 6.1)",
    asmeGroup: "6.1",
    description: "13Cr martensitic stainless steel",
  },
  {
    steelSpecPattern: "TP410S",
    ptRatingMaterialGroup: "Martensitic Stainless Steel (Group 6.1)",
    asmeGroup: "6.1",
    description: "13Cr low-carbon martensitic stainless steel",
  },
  {
    steelSpecPattern: "TP420",
    ptRatingMaterialGroup: "Martensitic Stainless Steel (Group 6.3)",
    asmeGroup: "6.3",
    description: "13Cr high-carbon martensitic stainless steel",
  },
  {
    steelSpecPattern: "A268",
    ptRatingMaterialGroup: "Ferritic Stainless Steel (Group 7.1)",
    asmeGroup: "7.1",
    description: "Ferritic/martensitic stainless steel tubing",
  },
  {
    steelSpecPattern: "Ferritic",
    ptRatingMaterialGroup: "Ferritic Stainless Steel (Group 7.1)",
    asmeGroup: "7.1",
    description: "Generic ferritic stainless steel",
  },
  {
    steelSpecPattern: "Martensitic",
    ptRatingMaterialGroup: "Martensitic Stainless Steel (Group 6.1)",
    asmeGroup: "6.1",
    description: "Generic martensitic stainless steel",
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
    steelSpecPattern: "Nickel 200",
    ptRatingMaterialGroup: "Nickel 200 (Group 4.5)",
    asmeGroup: "4.5",
    description: "Commercially pure nickel",
  },
  {
    steelSpecPattern: "Nickel 201",
    ptRatingMaterialGroup: "Nickel 200 (Group 4.5)",
    asmeGroup: "4.5",
    description: "Low-carbon nickel",
  },
  {
    steelSpecPattern: "Nickel",
    ptRatingMaterialGroup: "Nickel 200 (Group 4.5)",
    asmeGroup: "4.5",
    description: "Generic pure nickel",
  },
  {
    steelSpecPattern: "Cu-Ni 90-10",
    ptRatingMaterialGroup: "Copper-Nickel 90-10 (Group 4.6)",
    asmeGroup: "4.6",
    description: "90% Copper, 10% Nickel marine alloy",
  },
  {
    steelSpecPattern: "Cu-Ni 70-30",
    ptRatingMaterialGroup: "Copper-Nickel 70-30 (Group 4.7)",
    asmeGroup: "4.7",
    description: "70% Copper, 30% Nickel marine alloy",
  },
  {
    steelSpecPattern: "C70600",
    ptRatingMaterialGroup: "Copper-Nickel 90-10 (Group 4.6)",
    asmeGroup: "4.6",
    description: "UNS C70600 Cu-Ni 90-10",
  },
  {
    steelSpecPattern: "C71500",
    ptRatingMaterialGroup: "Copper-Nickel 70-30 (Group 4.7)",
    asmeGroup: "4.7",
    description: "UNS C71500 Cu-Ni 70-30",
  },
  {
    steelSpecPattern: "B466",
    ptRatingMaterialGroup: "Copper-Nickel 90-10 (Group 4.6)",
    asmeGroup: "4.6",
    description: "Cu-Ni seamless pipe",
  },
  {
    steelSpecPattern: "S32707",
    ptRatingMaterialGroup: "Hyper Duplex Stainless Steel (Group 3.4)",
    asmeGroup: "3.4",
    description: "Hyper Duplex 27Cr-7Ni-5Mo",
  },
  {
    steelSpecPattern: "Hyper Duplex",
    ptRatingMaterialGroup: "Hyper Duplex Stainless Steel (Group 3.4)",
    asmeGroup: "3.4",
    description: "Hyper Duplex stainless steel",
  },
  {
    steelSpecPattern: "A387",
    ptRatingMaterialGroup: "Low Alloy Steel F22 (Group 1.10)",
    asmeGroup: "1.10",
    description: "Chrome-moly pressure vessel plate",
  },
  {
    steelSpecPattern: "A420",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Low-temp wrought fittings",
  },
  {
    steelSpecPattern: "A369",
    ptRatingMaterialGroup: "Low Alloy Steel F11 (Group 1.9)",
    asmeGroup: "1.9",
    description: "Forged alloy pipe",
  },
  {
    steelSpecPattern: "A210",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Boiler/superheater tubes",
  },
  {
    steelSpecPattern: "A214",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "ERW heat exchanger tubes",
  },
  {
    steelSpecPattern: "A334",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Low-temp heat exchanger tubes",
  },
  {
    steelSpecPattern: "DIN 2448",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "German seamless carbon steel pipe",
  },
  {
    steelSpecPattern: "DIN 2458",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "German welded carbon steel pipe",
  },
  {
    steelSpecPattern: "DIN 2391",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "German precision seamless steel tube",
  },
  {
    steelSpecPattern: "St35.8",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "DIN carbon steel grade",
  },
  {
    steelSpecPattern: "St37.0",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "DIN structural carbon steel grade",
  },
  {
    steelSpecPattern: "St45.8",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "DIN high-strength carbon steel grade",
  },
  {
    steelSpecPattern: "St52",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "DIN high-strength structural steel grade",
  },
  {
    steelSpecPattern: "1.4301",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "EN/DIN 304 equivalent (X5CrNi18-10)",
  },
  {
    steelSpecPattern: "1.4306",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "EN/DIN 304L equivalent (X2CrNi19-11)",
  },
  {
    steelSpecPattern: "1.4401",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "EN/DIN 316 equivalent (X5CrNiMo17-12-2)",
  },
  {
    steelSpecPattern: "1.4404",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "EN/DIN 316L equivalent (X2CrNiMo17-12-2)",
  },
  {
    steelSpecPattern: "1.4462",
    ptRatingMaterialGroup: "Duplex Stainless Steel F51 (Group 3.2)",
    asmeGroup: "3.2",
    description: "EN/DIN Duplex 2205 equivalent",
  },
  {
    steelSpecPattern: "1.4410",
    ptRatingMaterialGroup: "Super Duplex Stainless Steel F55 (Group 3.3)",
    asmeGroup: "3.3",
    description: "EN/DIN Super Duplex 2507 equivalent",
  },
  {
    steelSpecPattern: "JIS G3454",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Japanese carbon steel pipe for pressure service",
  },
  {
    steelSpecPattern: "JIS G3456",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Japanese high-temp carbon steel pipe",
  },
  {
    steelSpecPattern: "JIS G3459",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Japanese stainless steel pipe",
  },
  {
    steelSpecPattern: "STPG370",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "JIS carbon steel grade (equivalent to A106 Gr B)",
  },
  {
    steelSpecPattern: "STPG410",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "JIS high-strength carbon steel grade",
  },
  {
    steelSpecPattern: "STPH370",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "JIS high-temp carbon steel grade",
  },
  {
    steelSpecPattern: "SUS304",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "JIS 304 stainless steel",
  },
  {
    steelSpecPattern: "SUS316",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "JIS 316 stainless steel",
  },
  {
    steelSpecPattern: "SUS321",
    ptRatingMaterialGroup: "Stainless Steel 321 (Group 2.2)",
    asmeGroup: "2.2",
    description: "JIS 321 stainless steel",
  },
  {
    steelSpecPattern: "GB/T 8163",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Chinese seamless carbon steel pipe",
  },
  {
    steelSpecPattern: "GB/T 9711",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Chinese line pipe (equivalent to API 5L)",
  },
  {
    steelSpecPattern: "GB/T 14976",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Chinese stainless steel pipe",
  },
  {
    steelSpecPattern: "20#",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Chinese carbon steel grade (equivalent to A106 Gr A)",
  },
  {
    steelSpecPattern: "45#",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Chinese medium carbon steel grade",
  },
  {
    steelSpecPattern: "Q345",
    ptRatingMaterialGroup: "Carbon Steel A105 (Group 1.1)",
    asmeGroup: "1.1",
    description: "Chinese structural steel grade",
  },
  {
    steelSpecPattern: "0Cr18Ni9",
    ptRatingMaterialGroup: "Stainless Steel 304 (Group 2.1)",
    asmeGroup: "2.1",
    description: "Chinese 304 stainless equivalent",
  },
  {
    steelSpecPattern: "0Cr17Ni12Mo2",
    ptRatingMaterialGroup: "Stainless Steel 316 (Group 2.2)",
    asmeGroup: "2.2",
    description: "Chinese 316 stainless equivalent",
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
