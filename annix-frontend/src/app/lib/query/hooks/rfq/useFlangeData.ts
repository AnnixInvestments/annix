import { useQuery } from "@tanstack/react-query";
import {
  type BnwSetWeightRecord,
  type FlangeType,
  type FlangeTypeWeightRecord,
  flangeWeightApi,
  type GasketWeightRecord,
  masterDataApi,
  type RetainingRingWeightRecord,
} from "@/app/lib/api/client";
import { RETAINING_RING_CONFIG, STEEL_DENSITY_KG_M3 } from "@/app/lib/config/rfq/constants";
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
    .map((t) => ({ code: t.code, name: t.name, description: t.description || "" }));
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
    const ref = (t.standardReference || "").toUpperCase();
    if (!ref) return false;

    if (useAsmeTypes) {
      return ref.startsWith("ASME");
    }

    return ref === code;
  });

  return filtered.length > 0
    ? filtered.map((t) => ({ code: t.code, name: t.name, description: t.description || "" }))
    : null;
}

export function nbToOd(nbToOdMap: Record<number, number>, nb: number): number {
  return nbToOdMap[nb] || nb * 1.1;
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
  const match = allBnw.find(
    (b) => b.nominal_bore_mm === nominalBoreMm && b.pressure_class === pressureClass,
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
  const flangeOdMm = flangeOdMap[nbMm] || nbMm * 1.7;
  const flangeThicknessMm = Math.max(20, nbMm * 0.08);
  const singleFaceAreaM2 = Math.PI * (flangeOdMm / 2000) ** 2;
  const edgeAreaM2 = Math.PI * (flangeOdMm / 1000) * (flangeThicknessMm / 1000);
  return { external: singleFaceAreaM2 + edgeAreaM2, internal: singleFaceAreaM2 };
}
