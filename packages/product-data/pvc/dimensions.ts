// Typed pipe-dimensions API for PVC. Mirrors the HDPE
// `dimensions.ts` shape — `pipeDimensions(dn, grade, class)`
// returns OD/wall/ID/mass for the catalogue-stocked size.
//
// Data origin: PVC_WALL_THICKNESS_DATA in index.ts (legacy) was
// originally lifted from Marley and Flo-Tek catalogue tables.
// This file re-exposes it as a structured API so callers don't
// have to know about the legacy shape, and adds per-grade
// validity gating (Class 34/40 only on PVC-O, Class 6 only on
// PVC-U etc.).
//
// Standard reproduction posture: outside diameters per nominal
// bore are dictated by SANS 966 dimensions but are also published
// in every supplier catalogue we cite. Class-by-class wall
// thicknesses come from catalogues only.

import { isPvcClassValidForGrade, type PvcPressureClass } from "./classes";
import type { PvcGradeCode } from "./grades";
import { PVC_GRADES } from "./grades";
import { PVC_WALL_THICKNESS_DATA, type PvcWallThickness } from "./wall-thickness-data";

export interface PvcPipeDimensions {
  dnMm: number;
  odMm: number;
  wallMm: number;
  idMm: number;
  massPerMetreKg: number;
  grade: PvcGradeCode;
  pressureClass: PvcPressureClass;
}

const wallRowByDn = (dnMm: number): PvcWallThickness | null =>
  PVC_WALL_THICKNESS_DATA.find((row) => row.nominalBoreMm === dnMm) ?? null;

const massPerMetreKg = (odMm: number, wallMm: number, densityKgM3: number): number => {
  const idMm = odMm - 2 * wallMm;
  const odM = odMm / 1000;
  const idM = idMm / 1000;
  const crossSectionM2 = (Math.PI / 4) * (odM * odM - idM * idM);
  return crossSectionM2 * densityKgM3;
};

// Look up the catalogue dimensions for a given DN/grade/class
// combination. Returns null when the size is not stocked in that
// pressure class or the class is not commercially produced for
// the grade.
export const pipeDimensions = (
  dnMm: number,
  grade: PvcGradeCode,
  pressureClass: PvcPressureClass,
): PvcPipeDimensions | null => {
  if (!isPvcClassValidForGrade(grade, pressureClass)) return null;
  const row = wallRowByDn(dnMm);
  if (!row) return null;
  const wallMm = row.wallThicknessByClass[pressureClass];
  if (wallMm == null) return null;
  const odMm = row.outsideDiameterMm;
  const idMm = odMm - 2 * wallMm;
  const density = PVC_GRADES[grade].densityKgM3;
  return {
    dnMm,
    odMm,
    wallMm,
    idMm: Math.round(idMm * 100) / 100,
    massPerMetreKg: Math.round(massPerMetreKg(odMm, wallMm, density) * 1000) / 1000,
    grade,
    pressureClass,
  };
};

// Return every commercially-stocked size for a grade + class
// combination. Useful for populating the wizard's DN dropdown
// — sizes not in the list aren't catalogue-stocked and quoting
// them invites delivery risk.
export const pvcAvailableSizes = (
  grade: PvcGradeCode,
  pressureClass: PvcPressureClass,
): number[] => {
  if (!isPvcClassValidForGrade(grade, pressureClass)) return [];
  return PVC_WALL_THICKNESS_DATA.filter(
    (row) => row.wallThicknessByClass[pressureClass] != null,
  ).map((row) => row.nominalBoreMm);
};

// Catalogue-stocked DN list across all grades + classes — the
// universe of PVC sizes Annix can quote. Same shape as
// `PVC_NOMINAL_SIZES` legacy export, just typed.
export const PVC_CATALOGUE_DNS: number[] = PVC_WALL_THICKNESS_DATA.map((row) => row.nominalBoreMm);

// Outside-diameter lookup. SANS 966 outside diameters follow ISO
// metric series so the OD doesn't change with grade or class
// (the wall changes; the bore changes; the OD stays).
export const pvcOutsideDiameter = (dnMm: number): number | null => {
  const row = wallRowByDn(dnMm);
  return row ? row.outsideDiameterMm : null;
};
