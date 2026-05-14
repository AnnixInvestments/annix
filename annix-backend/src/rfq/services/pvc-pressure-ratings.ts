/**
 * PVC (uPVC / Rigid PVC) pressure-rating + temperature-derating
 * reference. Parallel module to hdpe-pressure-ratings.ts; the math
 * shape is identical but the constants differ.
 *
 * Density / strength:
 *   uPVC density:  ~1400 kg/m³ (typical 1380–1450, commonly 1400)
 *   Design stress: ~10 MPa at 20°C, 50-year design life per ISO 1452-2
 *
 * Pressure rating formula (ISO 1452-2, water at 20°C):
 *   PN = (2 × σ_s) / (SDR − 1)
 * with σ_s = 10 MPa → PN = 20 / (SDR − 1) (in MPa) → ×10 for bar.
 *
 * Published ISO 1452 / SANS 966 / AS/NZS 1477 PVC SDR→PN points:
 *   SDR  9   → PN 25
 *   SDR 11   → PN 20
 *   SDR 13.6 → PN 16
 *   SDR 17   → PN 12.5
 *   SDR 21   → PN 10
 *   SDR 26   → PN 8
 *   SDR 33   → PN 6.3
 *   SDR 41   → PN 5
 *   SDR 51   → PN 4
 *
 * PVC pipe is also commonly specified by **Pressure Class** rather
 * than SDR — Class 6 / 9 / 12 / 16 / 20 / 25 each correspond
 * directly to PN(bar). The two systems map onto each other via the
 * SDR↔PN table above.
 *
 * Temperature derating (uPVC, water service, continuous):
 *   uPVC derates FASTER than HDPE — strength drops more steeply
 *   above 20°C. Max continuous service temperature is 60°C.
 *
 *   20°C → 1.00
 *   30°C → 0.87
 *   40°C → 0.70
 *   50°C → 0.58
 *   60°C → 0.45
 *
 * Sources:
 *   - ISO 1452-2:2009 (Plastics piping systems for water supply
 *     and for buried and above-ground drainage — Unplasticized
 *     poly(vinyl chloride) — Part 2: Pipes)
 *   - SANS 966-1 (South African PVC pressure pipe standard)
 *   - PIPA-published uPVC pressure / temperature charts
 *   - Manufacturer datasheets (Marley, Plastiflo, etc.)
 */

export const PVC_DENSITY_KG_DM3 = 1.4;

/**
 * Published ISO 1452 PVC SDR → PN(bar) table. Authoritative for
 * standard SDRs; non-standard values fall back to the formula
 * PN = 20 / (SDR − 1) × 10 (bar).
 */
const PVC_SDR_TO_PN_BAR: ReadonlyArray<{ sdr: number; pn: number }> = [
  { sdr: 9, pn: 25 },
  { sdr: 11, pn: 20 },
  { sdr: 13.6, pn: 16 },
  { sdr: 17, pn: 12.5 },
  { sdr: 21, pn: 10 },
  { sdr: 26, pn: 8 },
  { sdr: 33, pn: 6.3 },
  { sdr: 41, pn: 5 },
  { sdr: 51, pn: 4 },
];

/**
 * Pressure-class shorthand → PN(bar). PVC pipe is often spec'd by
 * Class rather than SDR; the two are interchangeable at the
 * standard rungs. We accept either form on input and map to PN.
 */
const PVC_PRESSURE_CLASS_TO_PN_BAR: Record<string, number> = {
  "Class 4": 4,
  "Class 5": 5,
  "Class 6": 6,
  "Class 8": 8,
  "Class 9": 9,
  "Class 10": 10,
  "Class 12": 12,
  Class12: 12,
  "Class 16": 16,
  Class16: 16,
  "Class 20": 20,
  "Class 25": 25,
  CL4: 4,
  CL6: 6,
  CL9: 9,
  CL12: 12,
  CL16: 16,
  CL20: 20,
  CL25: 25,
};

/**
 * Derive PN (bar) from SDR for PVC. Honours the published ISO 1452
 * table on standard SDRs; falls back to the formula for non-
 * standard values. Returns undefined on bad input.
 */
export function pvcPnFromSdr(sdr?: number): number | undefined {
  if (!sdr || sdr <= 1) return undefined;
  const match = PVC_SDR_TO_PN_BAR.find((row) => row.sdr === sdr);
  if (match) return match.pn;
  // 2 × σ_s / (SDR − 1) with σ_s = 10 MPa → bar.
  const pnMpa = 20 / (sdr - 1);
  return Math.round(pnMpa * 10 * 10) / 10;
}

/**
 * Inverse — SDR from PN. Useful when a line carries a pressure
 * class but no SDR. Returns undefined when the PN doesn't match a
 * published rung within rounding.
 */
export function pvcSdrFromPn(pn?: number): number | undefined {
  if (!pn || pn <= 0) return undefined;
  const match = PVC_SDR_TO_PN_BAR.find((row) => row.pn === pn);
  if (match) return match.sdr;
  // Inverse formula: SDR = 20 / (PN in MPa) + 1.
  const pnMpa = pn / 10;
  const sdr = 20 / pnMpa + 1;
  return Math.round(sdr * 10) / 10;
}

/**
 * Translate a Pressure-Class string ("Class 16", "CL12", etc.) to
 * PN(bar). Returns undefined when the class isn't recognised.
 */
export function pvcPnFromPressureClass(pressureClass?: string): number | undefined {
  if (!pressureClass) return undefined;
  const normalised = pressureClass.trim();
  if (PVC_PRESSURE_CLASS_TO_PN_BAR[normalised] != null) {
    return PVC_PRESSURE_CLASS_TO_PN_BAR[normalised];
  }
  // Fallback: "Class N" or "CLN" or bare "N" — extract the digit.
  const m = normalised.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = Number(m[1]);
    if (n > 0 && n <= 100) return n;
  }
  return undefined;
}

/**
 * uPVC temperature derating curve. Below 20°C → 1.00. Above 60°C
 * is outside the standard service window and caller should warn;
 * we clamp to 0.45 to stay defensive.
 *
 * Anchor points are conservative-end values from the ISO 1452 /
 * manufacturer-published tables in chat.
 */
const PVC_DERATING_TABLE: ReadonlyArray<{ tempC: number; factor: number }> = [
  { tempC: 20, factor: 1.0 },
  { tempC: 30, factor: 0.87 },
  { tempC: 40, factor: 0.7 },
  { tempC: 50, factor: 0.58 },
  { tempC: 60, factor: 0.45 },
];

export function pvcDeratingFactor(tempC?: number): number {
  if (tempC == null || tempC <= 20) return 1.0;
  if (tempC >= 60) return PVC_DERATING_TABLE[PVC_DERATING_TABLE.length - 1].factor;
  for (let i = 0; i < PVC_DERATING_TABLE.length - 1; i++) {
    const lo = PVC_DERATING_TABLE[i];
    const hi = PVC_DERATING_TABLE[i + 1];
    if (tempC >= lo.tempC && tempC <= hi.tempC) {
      const t = (tempC - lo.tempC) / (hi.tempC - lo.tempC);
      return Math.round((lo.factor + t * (hi.factor - lo.factor)) * 100) / 100;
    }
  }
  return 1.0;
}

export function pvcDeratedPn(basePn?: number, tempC?: number): number | undefined {
  if (basePn == null || basePn <= 0) return undefined;
  return Math.round(basePn * pvcDeratingFactor(tempC) * 10) / 10;
}
