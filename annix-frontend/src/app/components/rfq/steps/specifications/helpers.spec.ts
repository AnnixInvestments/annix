import { describe, expect, it } from "vitest";
import {
  autoFilledClass,
  deriveTemperatureCategory,
  extractPressureNumeric,
  serviceLifeToDurability,
} from "./helpers";

describe("extractPressureNumeric", () => {
  it("returns 0 for null", () => {
    expect(extractPressureNumeric(null)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(extractPressureNumeric("")).toBe(0);
  });

  it("returns 0 for non-numeric prefix like 'PN16'", () => {
    // PN16 starts with letters, no leading digit — function returns 0
    expect(extractPressureNumeric("PN16")).toBe(0);
  });

  it("extracts leading numeric prefix", () => {
    expect(extractPressureNumeric("16PN")).toBe(16);
    expect(extractPressureNumeric("150 Class")).toBe(150);
    expect(extractPressureNumeric("2500lb")).toBe(2500);
  });

  it("returns 0 for non-numeric prefix", () => {
    expect(extractPressureNumeric("Class 150")).toBe(0);
  });

  it("handles single-digit prefix", () => {
    expect(extractPressureNumeric("6 ")).toBe(6);
  });
});

describe("autoFilledClass", () => {
  it("returns emerald-styled classes when auto-filled", () => {
    const result = autoFilledClass(true);
    expect(result).toContain("border-emerald-500");
    expect(result).toContain("bg-emerald-50");
    expect(result).toContain("font-semibold");
  });

  it("returns neutral classes when not auto-filled", () => {
    const result = autoFilledClass(false);
    expect(result).toContain("border-gray-300");
    expect(result).toContain("text-gray-900");
    expect(result).not.toContain("emerald");
  });
});

describe("serviceLifeToDurability", () => {
  it("maps 'Short' to 'L'", () => {
    expect(serviceLifeToDurability("Short")).toBe("L");
  });

  it("maps 'Medium' to 'M'", () => {
    expect(serviceLifeToDurability("Medium")).toBe("M");
  });

  it("maps 'Long' to 'H'", () => {
    expect(serviceLifeToDurability("Long")).toBe("H");
  });

  it("maps 'Extended' to 'VH'", () => {
    expect(serviceLifeToDurability("Extended")).toBe("VH");
  });

  it("returns null for null input", () => {
    expect(serviceLifeToDurability(null)).toBeNull();
  });

  it("returns null for unknown values", () => {
    expect(serviceLifeToDurability("Forever")).toBeNull();
    expect(serviceLifeToDurability("")).toBeNull();
  });
});

describe("deriveTemperatureCategory", () => {
  it("returns null for null input", () => {
    expect(deriveTemperatureCategory(null)).toBeNull();
  });

  it("returns 'Ambient' for typical working temps (-20 to 60 °C)", () => {
    expect(deriveTemperatureCategory(-20)).toBe("Ambient");
    expect(deriveTemperatureCategory(0)).toBe("Ambient");
    expect(deriveTemperatureCategory(20)).toBe("Ambient");
    expect(deriveTemperatureCategory(60)).toBe("Ambient");
  });

  it("returns 'Elevated' for 60-120 °C", () => {
    // Note: 60 lands in "Ambient" branch first (< -20 || > 60 is false at exactly 60).
    // Above 60 enters the elevated/high branch.
    expect(deriveTemperatureCategory(80)).toBe("Elevated");
    expect(deriveTemperatureCategory(120)).toBe("Elevated");
  });

  it("returns 'High' for 120-200 °C", () => {
    expect(deriveTemperatureCategory(150)).toBe("High");
    expect(deriveTemperatureCategory(200)).toBe("High");
  });

  it("returns 'High' for above 200 °C", () => {
    expect(deriveTemperatureCategory(250)).toBe("High");
    expect(deriveTemperatureCategory(500)).toBe("High");
  });

  it("returns 'Ambient' for cryogenic (below -20)", () => {
    expect(deriveTemperatureCategory(-40)).toBe("Ambient");
    expect(deriveTemperatureCategory(-100)).toBe("Ambient");
  });
});
