import { RETAINING_RING_CONFIG } from "@annix/product-data/pipe";
import { STEEL_DENSITY_KG_M3 } from "@annix/product-data/steel";
import { useQuery } from "@tanstack/react-query";
import { keys } from "es-toolkit/compat";
import {
  type BnwSetWeightRecord,
  type FlangeType,
  type FlangeTypeWeightRecord,
  flangeWeightApi,
  type GasketWeightRecord,
  masterDataApi,
  type RetainingRingWeightRecord,
} from "@/app/lib/api/client";
import { SANS1123_BOLTING } from "@/app/lib/config/rfq/sans1123Bolting";
import { normaliseScheduleDesignation } from "@/app/lib/nix/components/quote/surfaceAreaForQuoteItem";
import { flangeWeightKeys } from "../../keys";

export type { FlangeType, FlangeTypeWeightRecord };

export interface FlangeTypeInfo {
  code: string;
  name: string;
  description: string;
}

export interface BnwSetResult {
  boltSize: string;
  weightPerHole: number;
  holesPerFlange: number;
}

export interface FlangeLookupContext {
  flangeWeight: (nb: number, pc: string, standard: string | null, typeCode: string) => number;
  blankFlangeWeight: (nb: number, pc: string) => number;
  sansBlankFlangeWeight: (nb: number, tableDesignation: string) => number;
  bnwSetInfo: (nb: number, pc: string) => BnwSetResult;
  gasketWeight: (gasketType: string, nb: number) => number;
  blankFlangeSurfaceArea: (nb: number) => { external: number; internal: number };
}

export function useNbToOdMap() {
  return useQuery<Record<number, number>>({
    queryKey: flangeWeightKeys.nbToOdMap(),
    queryFn: async () => {
      const records = await flangeWeightApi.allNbToOd();
      return records.reduce<Record<number, number>>(
        (acc, r) => ({ ...acc, [r.nominal_bore_mm]: Number(r.outside_diameter_mm) }),
        {},
      );
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * Lookup map from `${nb}|${normalisedSchedule}` to wall thickness in mm,
 * built from the pipe_schedules DB table. Lets the ASCA quote m²
 * calculator resolve a real wall for a schedule-only pipe (e.g. a
 * "100NB x HVY" SABS 62 Heavy pipe) instead of a linear approximation.
 *
 * Schedule designations are normalised so the DB's "Heavy" / "STD" /
 * "40" and a drawing's "HVY" / "SCH.STD" / "SCH40" collapse to the same
 * key. Carbon-steel rows win over stainless (ASME B36.19) when a
 * schedule name collides across standards (40S / XS / 5S).
 */
export function usePipeScheduleWallMap() {
  return useQuery<Record<string, number>>({
    queryKey: flangeWeightKeys.scheduleWallMap(),
    queryFn: async () => {
      const records = await flangeWeightApi.allPipeSchedules();
      const map: Record<string, number> = {};
      for (const r of records) {
        const nb = Number(r.nbMm);
        const sched = normaliseScheduleDesignation(r.schedule);
        const wall = Number(r.wallThicknessMm);
        if (!Number.isFinite(nb) || nb <= 0 || !sched) continue;
        if (!Number.isFinite(wall) || wall <= 0) continue;
        const key = `${nb}|${sched}`;
        if (map[key] === undefined || r.standardCode !== "ASME B36.19") {
          map[key] = wall;
        }
      }
      return map;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAllFlangeTypeWeights() {
  return useQuery<FlangeTypeWeightRecord[]>({
    queryKey: flangeWeightKeys.allWeights(),
    queryFn: () => flangeWeightApi.allFlangeTypeWeights(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAllBnwSetWeights() {
  return useQuery<BnwSetWeightRecord[]>({
    queryKey: flangeWeightKeys.allBnwSets(),
    queryFn: () => flangeWeightApi.allBnwSetWeights(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAllRetainingRingWeights() {
  return useQuery<RetainingRingWeightRecord[]>({
    queryKey: flangeWeightKeys.allRetainingRings(),
    queryFn: () => flangeWeightApi.allRetainingRingWeights(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAllGasketWeights() {
  return useQuery<GasketWeightRecord[]>({
    queryKey: flangeWeightKeys.allGasketWeights(),
    queryFn: () => flangeWeightApi.allGasketWeights(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAllFlangeTypes() {
  return useQuery<FlangeType[]>({
    queryKey: flangeWeightKeys.allFlangeTypes(),
    queryFn: () => masterDataApi.getFlangeTypes(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function flangeTypesForStandard(
  allTypes: FlangeType[],
  standardRef: string,
): FlangeTypeInfo[] {
  return allTypes
    .filter((t) => t.standardReference === standardRef)
    .map((t) => {
      const rawDescription = t.description;

      return {
        code: t.code,
        name: t.name,
        description: rawDescription || "",
      };
    });
}

export function flangeTypesForStandardCode(
  allTypes: FlangeType[],
  standardCode: string,
): FlangeTypeInfo[] | null {
  if (!standardCode) return null;
  const code = standardCode.toUpperCase();

  const standardsUsingAsmeTypes = ["SABS 1123", "BS 4504", "BS 10"];
  const useAsmeTypes = code.startsWith("ASME") || standardsUsingAsmeTypes.includes(code);

  const filtered = allTypes.filter((t) => {
    const rawStandardReference = t.standardReference;
    const ref = (rawStandardReference || "").toUpperCase();
    if (!ref) return false;

    if (useAsmeTypes) {
      return ref.startsWith("ASME");
    }

    return ref === code;
  });

  return filtered.length > 0
    ? filtered.map((t) => {
        const rawDescription2 = t.description;

        return {
          code: t.code,
          name: t.name,
          description: rawDescription2 || "",
        };
      })
    : null;
}

export function nbToOd(nbToOdMap: Record<number, number>, nb: number): number {
  const rawNb = nbToOdMap[nb];
  return rawNb || nb * 1.1;
}

export function outerDiameterFromNB(
  nbToOdMap: Record<number, number>,
  nb: number,
  providedOD: number = 0,
): number {
  if (providedOD && providedOD > 0) return providedOD;
  if (nbToOdMap[nb]) return nbToOdMap[nb];
  const sizes = keys(nbToOdMap)
    .map(Number)
    .sort((a, b) => a - b);
  let closest = sizes[0];
  for (const size of sizes) {
    if (size <= nb) {
      closest = size;
    } else {
      break;
    }
  }
  const rawClosest = nbToOdMap[closest];
  return rawClosest || nb * 1.05;
}

export function useNbToOdLookup() {
  const { data: nbToOdMap = {} } = useNbToOdMap();
  return {
    nbToOd: (nb: number) => nbToOd(nbToOdMap, nb),
    outerDiameterFromNB: (nb: number, providedOD: number = 0) =>
      outerDiameterFromNB(nbToOdMap, nb, providedOD),
    nbToOdMap,
  };
}

export function flangeWeight(
  allWeights: FlangeTypeWeightRecord[],
  nominalBoreMm: number,
  pressureClass: string,
  flangeStandard: string | null,
  flangeTypeCode: string,
): number {
  const match = allWeights.find(
    (w) =>
      w.nominal_bore_mm === nominalBoreMm &&
      w.pressure_class === pressureClass &&
      w.flange_type_code === flangeTypeCode &&
      (flangeStandard === null ? w.flange_standard_id === null : true),
  );

  if (match) {
    return Number(match.weight_kg);
  }

  const byNbAndPc = allWeights.find(
    (w) =>
      w.nominal_bore_mm === nominalBoreMm &&
      w.pressure_class === pressureClass &&
      w.flange_type_code === flangeTypeCode,
  );
  if (byNbAndPc) {
    return Number(byNbAndPc.weight_kg);
  }

  const anyMatch = allWeights.find(
    (w) => w.nominal_bore_mm === nominalBoreMm && w.pressure_class === pressureClass,
  );
  if (anyMatch) {
    return Number(anyMatch.weight_kg);
  }

  return nominalBoreMm < 100
    ? 5
    : nominalBoreMm < 200
      ? 12
      : nominalBoreMm < 400
        ? 40
        : nominalBoreMm < 600
          ? 80
          : 150;
}

export function hasFlangeWeightRecord(
  allWeights: FlangeTypeWeightRecord[],
  nominalBoreMm: number,
  pressureClass: string,
): boolean {
  return allWeights.some(
    (w) => w.nominal_bore_mm === nominalBoreMm && w.pressure_class === pressureClass,
  );
}

export function blankFlangeWeight(
  allWeights: FlangeTypeWeightRecord[],
  nominalBoreMm: number,
  pressureClass: string,
): number {
  const blindCodes = ["/8", "8", "BL"];
  const match = allWeights.find(
    (w) =>
      w.nominal_bore_mm === nominalBoreMm &&
      w.pressure_class === pressureClass &&
      blindCodes.includes(w.flange_type_code),
  );

  if (match) {
    return Number(match.weight_kg);
  }

  return nominalBoreMm * 0.15;
}

export function sansBlankFlangeWeight(
  allWeights: FlangeTypeWeightRecord[],
  nominalBoreMm: number,
  tableDesignation: string,
): number {
  const tableMatch = tableDesignation.match(/^(\d+)/);
  if (!tableMatch) {
    return blankFlangeWeight(allWeights, nominalBoreMm, "PN16");
  }

  const kpa = parseInt(tableMatch[1], 10);
  const blindDesignation = `${kpa <= 600 ? 600 : kpa <= 1000 ? 1000 : kpa <= 1600 ? 1600 : kpa <= 2500 ? 2500 : 4000}/8`;

  const match = allWeights.find(
    (w) => w.nominal_bore_mm === nominalBoreMm && w.pressure_class === blindDesignation,
  );

  if (match) {
    return Number(match.weight_kg);
  }

  return blankFlangeWeight(
    allWeights,
    nominalBoreMm,
    `PN${kpa <= 1000 ? 10 : kpa <= 1600 ? 16 : kpa <= 2500 ? 25 : 40}`,
  );
}

export function bnwSetInfo(
  allBnw: BnwSetWeightRecord[],
  nominalBoreMm: number,
  pressureClass: string,
): BnwSetResult {
  // SANS 1123 table designations (e.g. "1000/3") use SANS drilling — which
  // differs from the EN/BS PN drilling the bnw_set_weights rows carry (e.g.
  // T1000 DN300 is 12 × M24, EN PN10 DN300 is 12 × M20). Resolve bolt size
  // and hole count from the SANS table, then price the weight from the
  // closest-length bnw row of the same bolt diameter.
  const sansMatch = pressureClass.match(/^(\d+)\s*\//);
  if (sansMatch) {
    const sans = SANS1123_BOLTING[sansMatch[1]]?.[nominalBoreMm];
    if (sans) {
      const sameDia = allBnw.filter((b) => {
        const rawDia = b.bolt_size.match(/^(M\d+)x/);
        return rawDia?.[1] === sans.bolt;
      });
      const targetLen = sans.lengthMm;
      const weightSource = sameDia.sort((a, b) => {
        if (targetLen === null) return 0;
        const lenOf = (r: BnwSetWeightRecord) => {
          const rawLen = r.bolt_size.match(/x(\d+)$/);
          return rawLen ? Number(rawLen[1]) : 0;
        };
        return Math.abs(lenOf(a) - targetLen) - Math.abs(lenOf(b) - targetLen);
      })[0];
      return {
        boltSize: targetLen ? `${sans.bolt}x${targetLen}` : sans.bolt,
        weightPerHole: weightSource ? Number(weightSource.weight_per_hole_kg) : 0.18,
        holesPerFlange: sans.holes,
      };
    }
  }

  const lookupClass = sansMatch
    ? `PN${
        parseInt(sansMatch[1], 10) <= 600
          ? 6
          : parseInt(sansMatch[1], 10) <= 1000
            ? 10
            : parseInt(sansMatch[1], 10) <= 1600
              ? 16
              : parseInt(sansMatch[1], 10) <= 2500
                ? 25
                : 40
      }`
    : pressureClass;

  const match = allBnw.find(
    (b) => b.nominal_bore_mm === nominalBoreMm && b.pressure_class === lookupClass,
  );

  if (match) {
    return {
      boltSize: match.bolt_size,
      weightPerHole: Number(match.weight_per_hole_kg),
      holesPerFlange: match.num_holes,
    };
  }

  return { boltSize: "M16x65", weightPerHole: 0.18, holesPerFlange: 8 };
}

export function boltHolesPerFlange(
  allBnw: BnwSetWeightRecord[],
  nominalBoreMm: number,
  pressureClass: string,
): number {
  const match = allBnw.find(
    (b) => b.nominal_bore_mm === nominalBoreMm && b.pressure_class === pressureClass,
  );
  return match ? match.num_holes : 8;
}

export function gasketWeightLookup(
  allGaskets: GasketWeightRecord[],
  gasketType: string,
  nominalBoreMm: number,
): number {
  const match = allGaskets.find(
    (g) => g.gasket_type === gasketType && g.nominal_bore_mm === nominalBoreMm,
  );

  if (match) {
    return Number(match.weight_kg);
  }

  const byNb = allGaskets
    .filter((g) => g.nominal_bore_mm === nominalBoreMm)
    .sort((a, b) => a.gasket_type.localeCompare(b.gasket_type));

  if (byNb.length > 0) {
    return Number(byNb[0].weight_kg);
  }

  return 0;
}

export function retainingRingWeightLookup(
  allRings: RetainingRingWeightRecord[],
  nominalBoreMm: number,
  pipeOdMm?: number,
  nbToOdMap?: Record<number, number>,
): number {
  const match = allRings.find((r) => r.nominal_bore_mm === nominalBoreMm);
  if (match) {
    return Number(match.weight_kg);
  }

  const pipeOd = pipeOdMm || (nbToOdMap ? nbToOdMap[nominalBoreMm] : null) || nominalBoreMm * 1.05;
  const { odMultiplier, minThicknessMm, maxThicknessMm, thicknessFactor } = RETAINING_RING_CONFIG;

  const ringOdMm = pipeOd * odMultiplier;
  const ringIdMm = pipeOd;
  const ringThicknessMm = Math.max(
    minThicknessMm,
    Math.min(maxThicknessMm, nominalBoreMm * thicknessFactor),
  );

  const ringOdM = ringOdMm / 1000;
  const ringIdM = ringIdMm / 1000;
  const thicknessM = ringThicknessMm / 1000;

  const volumeM3 = Math.PI * ((ringOdM ** 2 - ringIdM ** 2) / 4) * thicknessM;
  const weightKg = volumeM3 * STEEL_DENSITY_KG_M3;

  return Math.round(weightKg * 100) / 100;
}

export function buildFlangeLookups(
  allWeights: FlangeTypeWeightRecord[],
  allBnw: BnwSetWeightRecord[],
  allGaskets: GasketWeightRecord[],
  flangeOdMap: Record<number, number>,
): FlangeLookupContext {
  return {
    flangeWeight: (nb, pc, standard, typeCode) =>
      flangeWeight(allWeights, nb, pc, standard, typeCode),
    blankFlangeWeight: (nb, pc) => blankFlangeWeight(allWeights, nb, pc),
    sansBlankFlangeWeight: (nb, tableDesignation) =>
      sansBlankFlangeWeight(allWeights, nb, tableDesignation),
    bnwSetInfo: (nb, pc) => bnwSetInfo(allBnw, nb, pc),
    gasketWeight: (gasketType, nb) => gasketWeightLookup(allGaskets, gasketType, nb),
    blankFlangeSurfaceArea: (nb) => blankFlangeSurfaceArea(flangeOdMap, nb),
  };
}

export function blankFlangeSurfaceArea(
  flangeOdMap: Record<number, number>,
  nbMm: number,
): { external: number; internal: number } {
  const rawNbMm = flangeOdMap[nbMm];
  const flangeOdMm = rawNbMm || nbMm * 1.7;
  const flangeThicknessMm = Math.max(20, nbMm * 0.08);
  const singleFaceAreaM2 = Math.PI * (flangeOdMm / 2000) ** 2;
  const edgeAreaM2 = Math.PI * (flangeOdMm / 1000) * (flangeThicknessMm / 1000);
  return { external: singleFaceAreaM2 + edgeAreaM2, internal: singleFaceAreaM2 };
}
