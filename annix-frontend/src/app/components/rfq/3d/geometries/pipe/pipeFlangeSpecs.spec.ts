import { describe, expect, it } from "vitest";
import type { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";
import { getFlangeSpecs } from "./pipeFlangeSpecs";

// Minimal API row (no bolt relation joined — the common case in production).
const apiRow = (overrides: Partial<FlangeSpecData>): FlangeSpecData => ({
  flangeOdMm: 640,
  flangeBoreMm: 457,
  flangeThicknessMm: 28,
  flangeFaceMm: 0,
  flangeNumHoles: 20,
  flangePcdMm: 585,
  flangeBoltHoleDiameterMm: 30,
  flangeMassKg: 0,
  ...overrides,
});

describe("getFlangeSpecs (pipe)", () => {
  it("derives a DN-appropriate bolt length when the API row has no bolt relation", () => {
    // DN450 used to render a flat 70mm regardless of bore (issue #358).
    const { specs, isFromApi } = getFlangeSpecs(450, apiRow({}));
    expect(isFromApi).toBe(true);
    expect(specs.boltLength).toBe(110);
    expect(specs.boltLength).not.toBe(70);
  });

  it("derives bolt size from the hole diameter (Ø30 -> M27)", () => {
    const { specs } = getFlangeSpecs(450, apiRow({ flangeBoltHoleDiameterMm: 30 }));
    expect(specs.boltSize).toBe(27);
  });

  it("prefers a real joined bolt length/size over the fallback", () => {
    const { specs } = getFlangeSpecs(450, apiRow({ boltLengthMm: 95, boltDiameterMm: 24 }));
    expect(specs.boltLength).toBe(95);
    expect(specs.boltSize).toBe(24);
  });

  it("uses the curated table directly when there is no API row", () => {
    const { specs, isFromApi } = getFlangeSpecs(150, null);
    expect(isFromApi).toBe(false);
    expect(specs.boltLength).toBe(80);
    expect(specs.boltSize).toBe(20);
  });
});
