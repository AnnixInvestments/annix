import { log } from "@/app/lib/logger";

// Temperature derating factors for flange pressure classes
// SABS 1123 / EN 1092-1 / PN standards: No significant derating below 200°C for carbon steel
// ASME B16.5: More aggressive derating curve
// For simplicity, we use a conservative approach: no derating below 200°C (where most applications operate)
export const temperatureDerating = (temperatureCelsius: number): number => {
  // For temperatures below 200°C, no derating applied
  // This matches SABS 1123, EN 1092-1, and PN standards for carbon steel
  // These standards allow full rated pressure up to 200°C for P235GH / A105 materials
  if (temperatureCelsius <= 200) {
    return 1.0;
  }

  // Derating curve for temperatures above 200°C (based on EN 1092-1 for P235GH)
  const deratingCurve = [
    // Full rating up to 200°C
    { temp: 200, factor: 1.0 },
    { temp: 250, factor: 0.94 },
    { temp: 300, factor: 0.87 },
    { temp: 350, factor: 0.8 },
    { temp: 400, factor: 0.7 },
    { temp: 450, factor: 0.57 },
  ];

  // Above maximum temp - use minimum factor
  if (temperatureCelsius >= deratingCurve[deratingCurve.length - 1].temp) {
    return deratingCurve[deratingCurve.length - 1].factor;
  }

  const bracketIndex = deratingCurve
    .slice(0, -1)
    .findIndex(
      (p, i) => temperatureCelsius >= p.temp && temperatureCelsius <= deratingCurve[i + 1].temp,
    );
  if (bracketIndex !== -1) {
    const lower = deratingCurve[bracketIndex];
    const upper = deratingCurve[bracketIndex + 1];
    const tempRange = upper.temp - lower.temp;
    const factorRange = upper.factor - lower.factor;
    const tempOffset = temperatureCelsius - lower.temp;
    return lower.factor + (factorRange * tempOffset) / tempRange;
  }

  return 1.0;
};

// Helper function to recommend pressure class based on working pressure (in bar) and temperature
export const getRecommendedPressureClass = (
  workingPressureBar: number,
  pressureClasses: any[],
  temperatureCelsius?: number,
) => {
  if (!workingPressureBar || !pressureClasses.length) return null;

  // Get temperature derating factor (defaults to 1.0 for ambient/unknown)
  const deratingFactor =
    temperatureCelsius !== undefined ? temperatureDerating(temperatureCelsius) : 1.0;

  // Pressure class mappings for letter/special designations (bar ratings at ambient)
  const specialMappings: { [key: string]: number } = {
    // BS 10 & AS 2129 Table designations
    // Table D: ~7 bar
    "T/D": 7,
    // Table E: ~14 bar
    "T/E": 14,
    // Table F: ~21 bar
    "T/F": 21,
    // Table H: ~35 bar (AS 2129)
    "T/H": 35,
    // AWWA C207 Classes (approximate bar ratings)
    // ~86 psi = 6 bar
    "Class B": 6,
    // ~150 psi = 10 bar
    "Class D": 10,
    // ~250 psi = 17 bar
    "Class E": 17,
    // ~300 psi = 21 bar
    "Class F": 21,
    // BS 4504 explicit mappings (PN/flange type format)
    "6/3": 6,
    "10/3": 10,
    "16/3": 16,
    "25/3": 25,
    "40/3": 40,
    "64/3": 64,
    "100/3": 100,
    "160/3": 160,
    "6/7": 6,
    "10/7": 10,
    "16/7": 16,
    "25/7": 25,
    "40/7": 40,
    // PN prefix variants
    PN6: 6,
    PN10: 10,
    PN16: 16,
    PN25: 25,
    PN40: 40,
    PN64: 64,
    PN100: 100,
    PN160: 160,
    "PN6/3": 6,
    "PN10/3": 10,
    "PN16/3": 16,
    "PN25/3": 25,
    "PN40/3": 40,
    "PN6/7": 6,
    "PN10/7": 10,
    "PN16/7": 16,
    "PN25/7": 25,
    "PN40/7": 40,
  };

  // ASME Class to bar conversion (at ambient temperature ~38°C)
  const asmeClassToBar: { [key: string]: number } = {
    // Class 75 ≈ 10 bar (B16.47)
    "75": 10,
    // Class 150 ≈ 20 bar
    "150": 20,
    // Class 300 ≈ 51 bar
    "300": 51,
    // Class 400 ≈ 68 bar
    "400": 68,
    // Class 600 ≈ 102 bar
    "600": 102,
    // Class 900 ≈ 153 bar
    "900": 153,
    // Class 1500 ≈ 255 bar
    "1500": 255,
    // Class 2500 ≈ 425 bar
    "2500": 425,
  };

  // Extract rating from designation and apply temperature derating
  log.debug(
    "[PT-DEBUG] Processing pressure classes:",
    pressureClasses.map((pc) => pc.designation),
  );
  const classesWithRating = pressureClasses
    .map((pc) => {
      const designation = pc.designation?.trim();
      let ambientRating = 0;

      // Check if it's a special letter-based designation (BS 10, AS 2129, AWWA, BS 4504)
      if (designation && specialMappings[designation]) {
        ambientRating = specialMappings[designation];
        log.debug(`[PT-DEBUG] ${designation} -> specialMapping -> ${ambientRating} bar`);
      }
      // Check if it's ASME Class designation (75, 150, 300, etc.)
      else if (designation && asmeClassToBar[designation]) {
        ambientRating = asmeClassToBar[designation];
        log.debug(`[PT-DEBUG] ${designation} -> asmeClassToBar -> ${ambientRating} bar`);
      }
      // Check for API 6A psi format (2000 psi, 5000 psi, etc.)
      else {
        log.debug(`[PT-DEBUG] ${designation} checking regex patterns...`);
        const psiMatch = designation?.match(/^(\d+)\s*psi$/i);
        if (psiMatch) {
          ambientRating = Math.round(parseInt(psiMatch[1], 10) * 0.0689);
        }
        // Check for PN (Pressure Nominal) format - EN, DIN, GOST, AS 4087
        else {
          const pnMatch = designation?.match(/^PN\s*(\d+)/i);
          if (pnMatch) {
            ambientRating = parseInt(pnMatch[1], 10);
          }
          // Check for JIS K format (5K, 10K, etc.)
          else {
            const jisMatch = designation?.match(/^(\d+)K$/i);
            if (jisMatch) {
              ambientRating = parseInt(jisMatch[1], 10);
            }
            // Handle "/X" format designations (both SABS 1123 and BS 4504)
            // SABS 1123: 600/3=6bar, 1000/3=10bar, 1600/3=16bar (divide by 100)
            // BS 4504: 6/3=6bar, 10/3=10bar, 16/3=16bar (use directly)
            else {
              const slashMatch = designation?.match(/^(\d+)\s*\/\s*\d+$/);
              if (slashMatch) {
                const numericValue = parseInt(slashMatch[1], 10);
                // SABS 1123 uses large numbers (600, 1000, 1600, etc.) - divide by 100
                // BS 4504 uses small numbers (6, 10, 16, 25, 40, etc.) - use directly
                if (numericValue >= 500) {
                  // SABS: 1000 → 10 bar
                  ambientRating = numericValue / 100;
                } else {
                  // BS 4504: 10 → 10 bar
                  ambientRating = numericValue;
                }
              }
              // Fallback: try to extract any leading number
              else {
                const numMatch = designation?.match(/^(\d+)/);
                if (numMatch) {
                  const num = parseInt(numMatch[1], 10);
                  ambientRating = num >= 500 ? num / 100 : num;
                }
              }
            }
          }
        }
      }

      // Apply temperature derating to get actual rating at operating temperature
      const actualRating = ambientRating * deratingFactor;
      return { ...pc, barRating: actualRating, ambientRating };
    })
    .filter((pc) => pc.barRating > 0);

  log.debug(
    "[PT-DEBUG] classesWithRating after mapping:",
    classesWithRating.map((pc) => ({
      designation: pc.designation,
      barRating: pc.barRating,
      ambientRating: pc.ambientRating,
    })),
  );

  if (classesWithRating.length === 0) {
    log.debug("[PT-DEBUG] ERROR: No pressure classes with valid ratings!");
    log.warn(
      "No pressure classes with valid ratings found. Input classes:",
      pressureClasses.map((pc) => pc.designation).join(", "),
    );
    return null;
  }

  // Sort by bar rating ascending (ensure consistent ordering)
  classesWithRating.sort((a, b) => {
    // Primary sort by bar rating
    const ratingDiff = a.barRating - b.barRating;
    if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
    const rawDesignation = a.designation;
    const rawDesignation2 = b.designation;
    // Secondary sort by designation for consistency
    return (rawDesignation || "").localeCompare(rawDesignation2 || "");
  });

  // Log all available classes for debugging
  log.debug(
    `Available pressure classes for ${workingPressureBar} bar at ${temperatureCelsius ?? "ambient"}°C (derating: ${deratingFactor.toFixed(2)}):`,
    classesWithRating.map((pc) => `${pc.designation}=${pc.barRating.toFixed(1)}bar`).join(", "),
  );

  // Find the lowest rating that meets or exceeds the working pressure at operating temperature
  // Using small tolerance for floating point comparison
  const recommended = classesWithRating.find((pc) => pc.barRating >= workingPressureBar - 0.01);

  if (recommended) {
    log.debug(
      `Selected: ${recommended.designation} (${recommended.barRating.toFixed(1)} bar capacity) for ${workingPressureBar} bar working pressure`,
    );
  } else {
    log.debug(`No suitable class found for ${workingPressureBar} bar, using highest available`);
  }

  // Return highest if none match
  return recommended || classesWithRating[classesWithRating.length - 1];
};

// Fallback pressure classes by flange standard - IDs must match database
export const getFallbackPressureClasses = (standardId: number, flangeStandards: any[]) => {
  const standard = flangeStandards?.find((s: any) => s.id === standardId);
  const rawCode = standard?.code;
  const code = rawCode || "";

  // BS 4504 pressure classes (database IDs 1-8)
  if (code.includes("BS 4504")) {
    return [
      { id: 1, designation: "6/3", standardId },
      { id: 2, designation: "10/3", standardId },
      { id: 3, designation: "16/3", standardId },
      { id: 4, designation: "25/3", standardId },
      { id: 5, designation: "40/3", standardId },
      { id: 6, designation: "64/3", standardId },
      { id: 7, designation: "100/3", standardId },
      { id: 8, designation: "160/3", standardId },
    ];
  }
  // SABS 1123 pressure classes (database IDs 9-13)
  if (code.includes("SABS 1123")) {
    return [
      { id: 9, designation: "600/3", standardId },
      { id: 10, designation: "1000/3", standardId },
      { id: 11, designation: "1600/3", standardId },
      { id: 12, designation: "2500/3", standardId },
      { id: 13, designation: "4000/3", standardId },
    ];
  }
  // BS 10 pressure classes (database IDs 14-16)
  if (code.includes("BS 10")) {
    return [
      { id: 14, designation: "T/D", standardId },
      { id: 15, designation: "T/E", standardId },
      { id: 16, designation: "T/F", standardId },
    ];
  }
  // ASME B16.5 / ANSI B16.5 pressure classes (database IDs 17-23)
  if (code.includes("ASME B16.5") || code.includes("ANSI B16.5")) {
    return [
      { id: 17, designation: "150", standardId },
      { id: 18, designation: "300", standardId },
      { id: 19, designation: "400", standardId },
      { id: 20, designation: "600", standardId },
      { id: 21, designation: "900", standardId },
      { id: 22, designation: "1500", standardId },
      { id: 23, designation: "2500", standardId },
    ];
  }
  // EN 1092-1 pressure classes (database IDs 24-31)
  if (code.includes("EN 1092")) {
    return [
      { id: 24, designation: "PN 6", standardId },
      { id: 25, designation: "PN 10", standardId },
      { id: 26, designation: "PN 16", standardId },
      { id: 27, designation: "PN 25", standardId },
      { id: 28, designation: "PN 40", standardId },
      { id: 29, designation: "PN 63", standardId },
      { id: 30, designation: "PN 100", standardId },
      { id: 31, designation: "PN 160", standardId },
    ];
  }
  // DIN pressure classes (database IDs 32-36)
  if (code.includes("DIN")) {
    return [
      { id: 32, designation: "PN 6", standardId },
      { id: 33, designation: "PN 10", standardId },
      { id: 34, designation: "PN 16", standardId },
      { id: 35, designation: "PN 25", standardId },
      { id: 36, designation: "PN 40", standardId },
    ];
  }
  // JIS B2220 pressure classes (database IDs 37-43)
  if (code.includes("JIS")) {
    return [
      { id: 37, designation: "5K", standardId },
      { id: 38, designation: "10K", standardId },
      { id: 39, designation: "16K", standardId },
      { id: 40, designation: "20K", standardId },
      { id: 41, designation: "30K", standardId },
      { id: 42, designation: "40K", standardId },
      { id: 43, designation: "63K", standardId },
    ];
  }
  // AS 2129 pressure classes (database IDs 44-47)
  if (code.includes("AS 2129")) {
    return [
      { id: 44, designation: "T/D", standardId },
      { id: 45, designation: "T/E", standardId },
      { id: 46, designation: "T/F", standardId },
      { id: 47, designation: "T/H", standardId },
    ];
  }
  // AS 4087 pressure classes (database IDs 48-52)
  if (code.includes("AS 4087")) {
    return [
      { id: 48, designation: "PN 14", standardId },
      { id: 49, designation: "PN 16", standardId },
      { id: 50, designation: "PN 21", standardId },
      { id: 51, designation: "PN 25", standardId },
      { id: 52, designation: "PN 35", standardId },
    ];
  }
  // GOST pressure classes (database IDs 53-58)
  if (code.includes("GOST")) {
    return [
      { id: 53, designation: "PN 6", standardId },
      { id: 54, designation: "PN 10", standardId },
      { id: 55, designation: "PN 16", standardId },
      { id: 56, designation: "PN 25", standardId },
      { id: 57, designation: "PN 40", standardId },
      { id: 58, designation: "PN 63", standardId },
    ];
  }
  // ASME B16.47 pressure classes (database IDs 59-64)
  if (code.includes("ASME B16.47")) {
    return [
      { id: 59, designation: "75", standardId },
      { id: 60, designation: "150", standardId },
      { id: 61, designation: "300", standardId },
      { id: 62, designation: "400", standardId },
      { id: 63, designation: "600", standardId },
      { id: 64, designation: "900", standardId },
    ];
  }
  // API 6A pressure classes (database IDs 65-70)
  if (code.includes("API 6A")) {
    return [
      { id: 65, designation: "2000 psi", standardId },
      { id: 66, designation: "3000 psi", standardId },
      { id: 67, designation: "5000 psi", standardId },
      { id: 68, designation: "10000 psi", standardId },
      { id: 69, designation: "15000 psi", standardId },
      { id: 70, designation: "20000 psi", standardId },
    ];
  }
  // AWWA C207 pressure classes (database IDs 71-74)
  if (code.includes("AWWA")) {
    return [
      { id: 71, designation: "Class B", standardId },
      { id: 72, designation: "Class D", standardId },
      { id: 73, designation: "Class E", standardId },
      { id: 74, designation: "Class F", standardId },
    ];
  }
  // BS 1560 pressure classes (same as ASME)
  if (code.includes("BS 1560")) {
    return [
      { id: 901, designation: "150", standardId },
      { id: 902, designation: "300", standardId },
      { id: 903, designation: "600", standardId },
      { id: 904, designation: "900", standardId },
      { id: 905, designation: "1500", standardId },
      { id: 906, designation: "2500", standardId },
    ];
  }
  // Default empty
  return [];
};
