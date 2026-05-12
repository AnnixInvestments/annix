// Joining-method registry for PVC pipework. Each entry carries
// its applicability matrix (which sizes are commercially produced
// for that method, which pressure classes are typical, which
// grades are compatible). Mirrors the HDPE `welding.ts` shape so
// callers can iterate either polymer family identically.
//
// Catalogue-sourced (Flo-Tek, Marley, Macneil, Sizabantu, DPI).
// No SANS table data reproduced.

import type { PvcPressureClass } from "./classes";
import type { PvcGradeCode } from "./grades";

export type PvcJoiningMethod =
  | "solvent_cement"
  | "rubber_ring_joint"
  | "flanged"
  | "threaded"
  | "compression"
  | "electrofusion_couplers";

export interface PvcJoiningMethodInfo {
  code: PvcJoiningMethod;
  label: string;
  description: string;
  // Min/max DN (mm) commercially produced for this method.
  sizeRangeMm: { min: number; max: number };
  // Pressure-class window where this joint is reliable. Many
  // suppliers will solvent-weld up to Class 16; RRJ extends to
  // Class 25; flanged + backing covers everything.
  pressureClassRange: { min: PvcPressureClass; max: PvcPressureClass };
  // Grades the method is normally used with. PVC-O is biased
  // toward RRJ + flanged because the orientation grain can be
  // disturbed by solvent.
  compatibleGrades: PvcGradeCode[];
  // True when the contractor needs specialised equipment (pipe
  // threading machine, hydraulic crimper, fusion box).
  requiresSpecialEquipment: boolean;
  // Cost band relative to solvent_cement (= 1.0). Used by the
  // BOQ pricing helper to weight install rates per metre.
  relativeCostFactor: number;
  // Catalogue-cited install convention for the customer's
  // Notes field.
  installNote: string;
}

export const PVC_JOINING_METHODS: Record<PvcJoiningMethod, PvcJoiningMethodInfo> = {
  solvent_cement: {
    code: "solvent_cement",
    label: "Solvent Cement (Glue Weld)",
    description:
      "Cold chemical weld using PVC primer + solvent cement. Fast and inexpensive for small to medium sizes. Permanent joint — cannot be unscrewed.",
    sizeRangeMm: { min: 16, max: 250 },
    pressureClassRange: { min: 6, max: 16 },
    compatibleGrades: ["PVC-U", "PVC-M"],
    requiresSpecialEquipment: false,
    relativeCostFactor: 1.0,
    installNote:
      "Primer + solvent applied per SANS 966-1 install practice; minimum 1-hour set before pressure test.",
  },
  rubber_ring_joint: {
    code: "rubber_ring_joint",
    label: "Rubber Ring Joint (RRJ / Push-Fit)",
    description:
      "Socketed pipe with EPDM/NBR seal ring (SANS 1808). Push-fit assembly, allows axial movement, recommended for buried mains. Faster install than solvent cement on larger sizes.",
    sizeRangeMm: { min: 50, max: 630 },
    pressureClassRange: { min: 6, max: 25 },
    compatibleGrades: ["PVC-U", "PVC-M", "PVC-O"],
    requiresSpecialEquipment: false,
    relativeCostFactor: 1.2,
    installNote: "Seal rings per SANS 1808; check anchor blocks at bends per supplier handbook.",
  },
  flanged: {
    code: "flanged",
    label: "Flanged (PVC Stub + SANS 1123 Backing Ring)",
    description:
      "PVC stub-flange adapter spigot-jointed or solvent-welded to the line, paired with a steel / DI backing ring drilled per SANS 1123. The only practical way to mate PVC to valves and steel fittings.",
    sizeRangeMm: { min: 50, max: 500 },
    pressureClassRange: { min: 6, max: 25 },
    compatibleGrades: ["PVC-U", "PVC-M", "PVC-O"],
    requiresSpecialEquipment: false,
    relativeCostFactor: 2.5,
    installNote:
      "Backing ring drilling table per SANS 1123 (T1000/T1600/T2500); gasket EPDM unless service requires NBR.",
  },
  threaded: {
    code: "threaded",
    label: "Threaded (BSP / NPT)",
    description:
      "Cut BSP/NPT threads into the pipe end. Used only on small bores for fittings, gauges, and meter unions. Not for pressure-bearing main joints.",
    sizeRangeMm: { min: 15, max: 50 },
    pressureClassRange: { min: 6, max: 16 },
    compatibleGrades: ["PVC-U"],
    requiresSpecialEquipment: true,
    relativeCostFactor: 1.8,
    installNote: "Use PTFE tape; do not overtighten — PVC threads stress-crack under torque.",
  },
  compression: {
    code: "compression",
    label: "Compression Coupling (Plasson / Philmac)",
    description:
      "Mechanical coupling using compression nut + grip ring + O-ring seal. Quick repair joints, irrigation connections, transition fittings to HDPE.",
    sizeRangeMm: { min: 20, max: 160 },
    pressureClassRange: { min: 6, max: 16 },
    compatibleGrades: ["PVC-U", "PVC-M"],
    requiresSpecialEquipment: false,
    relativeCostFactor: 3.0,
    installNote:
      "Reusable, demountable. Higher per-joint cost than RRJ — use for transitions, not bulk runs.",
  },
  electrofusion_couplers: {
    code: "electrofusion_couplers",
    label: "Electrofusion Coupler (HDPE-to-PVC transition)",
    description:
      "Specialty fittings to transition PVC pipe into an HDPE main via an electrofusion coupler with PVC adapter spigot. Rare — most projects use a flanged transition instead.",
    sizeRangeMm: { min: 63, max: 250 },
    pressureClassRange: { min: 9, max: 16 },
    compatibleGrades: ["PVC-U", "PVC-M"],
    requiresSpecialEquipment: true,
    relativeCostFactor: 4.0,
    installNote:
      "Specialty fitting — confirm supplier carries the specific PVC-to-HDPE adapter before quoting.",
  },
};

export const PVC_JOINING_METHOD_LIST: PvcJoiningMethod[] = [
  "solvent_cement",
  "rubber_ring_joint",
  "flanged",
  "threaded",
  "compression",
  "electrofusion_couplers",
];

export const pvcJoiningMethodByCode = (code: PvcJoiningMethod): PvcJoiningMethodInfo =>
  PVC_JOINING_METHODS[code];

// Filter to methods commercially produced at the given size +
// pressure-class + grade. Returns an empty array when no method
// is suitable (caller should escalate to engineer review).
export const suitablePvcJoiningMethods = (params: {
  dnMm: number;
  pressureClass: PvcPressureClass;
  grade: PvcGradeCode;
}): PvcJoiningMethodInfo[] => {
  const { dnMm, pressureClass, grade } = params;
  return PVC_JOINING_METHOD_LIST.map((code) => PVC_JOINING_METHODS[code]).filter((method) => {
    const sizeOk = dnMm >= method.sizeRangeMm.min && dnMm <= method.sizeRangeMm.max;
    const classOk =
      pressureClass >= method.pressureClassRange.min &&
      pressureClass <= method.pressureClassRange.max;
    const gradeOk = method.compatibleGrades.includes(grade);
    return sizeOk && classOk && gradeOk;
  });
};

// Default joining-method picker — preferred when the customer
// hasn't expressed a preference. Solvent for small bores, RRJ for
// buried mains, flanged where the line meets valves or steel.
export const defaultPvcJoiningMethod = (params: {
  dnMm: number;
  pressureClass: PvcPressureClass;
  grade: PvcGradeCode;
  needsValveConnection: boolean;
}): PvcJoiningMethod | null => {
  const { dnMm, needsValveConnection } = params;
  if (needsValveConnection) return "flanged";
  const candidates = suitablePvcJoiningMethods(params);
  if (candidates.length === 0) return null;
  if (dnMm <= 50) {
    const solvent = candidates.find((m) => m.code === "solvent_cement");
    if (solvent) return solvent.code;
  }
  if (dnMm >= 100) {
    const rrj = candidates.find((m) => m.code === "rubber_ring_joint");
    if (rrj) return rrj.code;
  }
  return candidates[0].code;
};
