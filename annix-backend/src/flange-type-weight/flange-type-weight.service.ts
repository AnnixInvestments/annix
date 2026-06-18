import { Injectable } from "@nestjs/common";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";

export interface FlangeTypeWeightResult {
  found: boolean;
  weightKg: number | null;
  nominalBoreMm: number;
  pressureClass: string;
  flangeTypeCode: string;
  flangeStandardCode: string | null;
  notes?: string;
}

/**
 * Derive the flange-type code from a pressure-class designation, for the
 * SABS 1123 / BS 4504 standards whose designations embed the type as a suffix
 * (e.g. "1000/3", "10/3" -> "/3"). The per-type weight rows for these standards
 * key on this suffix (see flange_type_weights seed data), so it is the only
 * type signal available at the weight calculation sites.
 *
 * Returns null for other standards (ASME B16.5 etc.), where the type code is
 * carried out-of-band and not present in the designation — those sites cannot
 * resolve a per-type weight and must fall back to mass_kg.
 */
export function flangeTypeCodeFromDesignation(
  pressureClassDesignation: string | null | undefined,
  flangeStandardCode: string | null | undefined,
): string | null {
  if (!pressureClassDesignation || !flangeStandardCode) return null;

  const isSabsOrBs4504 =
    flangeStandardCode.includes("SABS 1123") ||
    flangeStandardCode.includes("SANS 1123") ||
    flangeStandardCode.includes("BS 4504");
  if (!isSabsOrBs4504) return null;

  const withSuffix = pressureClassDesignation.match(/^\d+(\/\d+)$/);
  return withSuffix ? withSuffix[1] : null;
}

@Injectable()
export class FlangeTypeWeightService {
  constructor(private readonly flangeTypeWeightRepository: FlangeTypeWeightRepository) {}

  async findAll(): Promise<FlangeTypeWeight[]> {
    return this.flangeTypeWeightRepository.findAllWithStandard();
  }

  /**
   * Resolve the per-type flange weight from the keys available at the weight
   * calculation sites (RFQ / fitting / bend), where the only flange-type signal
   * is the pressure-class DESIGNATION suffix carried by SABS 1123 / BS 4504 rows
   * (e.g. "1000/3" -> type "/3"). Mirrors the frontend's
   * `combineClassWithFlangeType` so the backend prefers the authoritative
   * per-type table exactly like the UI does.
   *
   * Returns `found: false` when no flange-type code can be derived (non-SANS
   * standards carry the type out-of-band, which these call sites don't have) or
   * when no matching weight row exists — callers must then fall back to the
   * type-ambiguous `flange_dimensions.mass_kg`.
   */
  async flangeTypeWeightForDesignation(
    nominalBoreMm: number,
    pressureClassDesignation: string | null | undefined,
    flangeStandardCode: string | null | undefined,
  ): Promise<FlangeTypeWeightResult> {
    const flangeTypeCode = flangeTypeCodeFromDesignation(
      pressureClassDesignation,
      flangeStandardCode,
    );

    if (!pressureClassDesignation || !flangeTypeCode) {
      return {
        found: false,
        weightKg: null,
        nominalBoreMm,
        pressureClass: pressureClassDesignation ?? "",
        flangeTypeCode: flangeTypeCode ?? "",
        flangeStandardCode: flangeStandardCode ?? null,
        notes: "No flange type code derivable from designation; mass_kg fallback applies.",
      };
    }

    // Prefer a standard-specific row, then fall back to a standard-agnostic
    // (flange_standard_id null) row. The seeded per-type weight rows are keyed
    // by (NB, pressure_class, flange_type_code) and in production carry a null
    // standard id, so the frontend's flangeWeight() matches them leniently on
    // standard — mirror that here, otherwise SANS 1123 rows never match and we
    // silently fall back to the type-ambiguous mass_kg.
    let result = await this.flangeTypeWeightRepository.findFlangeTypeWeight(
      nominalBoreMm,
      pressureClassDesignation,
      flangeTypeCode,
      flangeStandardCode ?? null,
    );
    if (!result && flangeStandardCode) {
      result = await this.flangeTypeWeightRepository.findFlangeTypeWeight(
        nominalBoreMm,
        pressureClassDesignation,
        flangeTypeCode,
        null,
      );
    }

    if (!result) {
      return {
        found: false,
        weightKg: null,
        nominalBoreMm,
        pressureClass: pressureClassDesignation,
        flangeTypeCode,
        flangeStandardCode: flangeStandardCode ?? null,
        notes: `No per-type weight row for NB${nominalBoreMm} ${pressureClassDesignation} ${flangeTypeCode}; mass_kg fallback applies.`,
      };
    }

    return {
      found: true,
      weightKg: Number(result.weight_kg),
      nominalBoreMm,
      pressureClass: pressureClassDesignation,
      flangeTypeCode,
      flangeStandardCode: flangeStandardCode ?? null,
    };
  }

  async flangeTypeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode: string | null,
    flangeTypeCode: string,
  ): Promise<FlangeTypeWeightResult> {
    const result = await this.flangeTypeWeightRepository.findFlangeTypeWeight(
      nominalBoreMm,
      pressureClass,
      flangeTypeCode,
      flangeStandardCode,
    );

    if (!result) {
      const estimatedWeight = nominalBoreMm * 0.15;
      return {
        found: false,
        weightKg: estimatedWeight,
        nominalBoreMm,
        pressureClass,
        flangeTypeCode,
        flangeStandardCode,
        notes: `No data found for NB${nominalBoreMm} ${pressureClass} ${flangeTypeCode}. Using estimate.`,
      };
    }

    return {
      found: true,
      weightKg: Number(result.weight_kg),
      nominalBoreMm,
      pressureClass,
      flangeTypeCode,
      flangeStandardCode,
    };
  }

  async blankFlangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
  ): Promise<FlangeTypeWeightResult> {
    const result = await this.flangeTypeWeightRepository.findBlankFlangeWeight(
      nominalBoreMm,
      pressureClass,
    );

    if (!result) {
      const estimatedWeight = nominalBoreMm * 0.2;
      return {
        found: false,
        weightKg: estimatedWeight,
        nominalBoreMm,
        pressureClass,
        flangeTypeCode: "BLANK",
        flangeStandardCode: null,
        notes: `No blank flange data found for NB${nominalBoreMm} ${pressureClass}. Using estimate.`,
      };
    }

    return {
      found: true,
      weightKg: Number(result.weight_kg),
      nominalBoreMm,
      pressureClass,
      flangeTypeCode: "BLANK",
      flangeStandardCode: null,
    };
  }

  async availablePressureClasses(): Promise<string[]> {
    const result = await this.flangeTypeWeightRepository.distinctPressureClasses();
    return result.map((r) => r.pressureClass);
  }

  async availableFlangeTypes(): Promise<string[]> {
    const result = await this.flangeTypeWeightRepository.distinctFlangeTypeCodes();
    return result.map((r) => r.flangeTypeCode);
  }
}
