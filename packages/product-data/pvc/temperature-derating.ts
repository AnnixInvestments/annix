// PVC temperature derating — working pressure must be multiplied by
// the derating factor when service temperature is above the rated
// 20 °C reference. Curves from Flo-Tek + Marley catalogues (uPVC and
// mPVC trend identically below 45 °C; PVC-O similar). cPVC has a
// wider service window and is handled separately when needed.
//
// Reference: SANS 966-1 cl. 7.4 (mentioned by name only — table data
// from manufacturer catalogues, not from SANS).

import type { PvcType } from "./index";

export interface PvcDeratingPoint {
  temperatureC: number;
  factor: number;
}

// uPVC / mPVC — straight pressure pipes & SANS 1601 solvent-weld
// fittings. Linear interpolation between points is acceptable.
const UPVC_MPVC_DERATING: PvcDeratingPoint[] = [
  { temperatureC: 10, factor: 1.1 },
  { temperatureC: 20, factor: 1.0 },
  { temperatureC: 25, factor: 0.9 },
  { temperatureC: 30, factor: 0.8 },
  { temperatureC: 35, factor: 0.7 },
  { temperatureC: 40, factor: 0.6 },
  { temperatureC: 45, factor: 0.45 },
  // Above 45 °C the standard does not recommend uPVC for pressure
  // duty — use cPVC, PVC-O or step to HDPE / steel.
];

// PVC-O — slightly lower upper bound (45 °C max continuous per
// Flo-Tek PVC-O brochure) and a marginally tighter curve.
const PVC_O_DERATING: PvcDeratingPoint[] = [
  { temperatureC: 10, factor: 1.1 },
  { temperatureC: 20, factor: 1.0 },
  { temperatureC: 25, factor: 0.88 },
  { temperatureC: 30, factor: 0.76 },
  { temperatureC: 35, factor: 0.64 },
  { temperatureC: 40, factor: 0.52 },
  { temperatureC: 45, factor: 0.4 },
];

// cPVC — wide service window up to 95 °C. Derating much shallower.
const CPVC_DERATING: PvcDeratingPoint[] = [
  { temperatureC: 20, factor: 1.0 },
  { temperatureC: 30, factor: 0.92 },
  { temperatureC: 40, factor: 0.84 },
  { temperatureC: 50, factor: 0.76 },
  { temperatureC: 60, factor: 0.68 },
  { temperatureC: 70, factor: 0.62 },
  { temperatureC: 80, factor: 0.55 },
  { temperatureC: 90, factor: 0.5 },
  { temperatureC: 95, factor: 0.45 },
];

const derateCurve = (pvcType: PvcType): PvcDeratingPoint[] => {
  if (pvcType === "PVC_O") return PVC_O_DERATING;
  if (pvcType === "cPVC") return CPVC_DERATING;
  return UPVC_MPVC_DERATING;
};

// Linear-interpolated derating factor at a given service temperature.
// Returns null when the temperature is outside the curve's bounds
// (caller decides whether to error or coerce to the nearest endpoint).
export const pvcDeratingFactor = (pvcType: PvcType, serviceTemperatureC: number): number | null => {
  const curve = derateCurve(pvcType);
  if (curve.length === 0) return null;
  if (serviceTemperatureC <= curve[0].temperatureC) return curve[0].factor;
  const last = curve[curve.length - 1];
  if (serviceTemperatureC >= last.temperatureC) return last.factor;
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1];
    const next = curve[i];
    if (serviceTemperatureC <= next.temperatureC) {
      const span = next.temperatureC - prev.temperatureC;
      const ratio = (serviceTemperatureC - prev.temperatureC) / span;
      return prev.factor + ratio * (next.factor - prev.factor);
    }
  }
  return null;
};

// Working pressure (bar) at the given service temperature, derived
// from the rated class pressure (which is defined at 20 °C).
export const pvcDeratedWorkingPressure = (
  pvcType: PvcType,
  classPressureBar: number,
  serviceTemperatureC: number,
): number | null => {
  const factor = pvcDeratingFactor(pvcType, serviceTemperatureC);
  return factor == null ? null : classPressureBar * factor;
};
