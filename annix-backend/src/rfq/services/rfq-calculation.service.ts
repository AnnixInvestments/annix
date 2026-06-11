import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BoltMassRepository } from "../../bolt-mass/bolt-mass.repository";
import { NutMassRepository } from "../../nut-mass/nut-mass.repository";
import { PipeDimension } from "../../pipe-dimension/entities/pipe-dimension.entity";
import { BendCalculationResultDto } from "../dto/bend-calculation-result.dto";
import { CreateBendRfqDto } from "../dto/create-bend-rfq.dto";
import { CreatePumpRfqDto } from "../dto/create-pump-rfq.dto";
import { UnifiedStraightPipeDto } from "../dto/create-unified-rfq.dto";
import { PumpCalculationResultDto } from "../dto/pump-calculation-result.dto";
import { StraightPipeCalculationResultDto } from "../dto/rfq-response.dto";
import { LengthUnit, QuantityType, ScheduleType } from "../entities/straight-pipe-rfq.entity";
import { ReferenceDataCacheService } from "./reference-data-cache.service";

const STEEL_DENSITY_KG_DM3 = 7.85;
// PE100 ~0.96 kg/dm³ (slightly lower than water, varies marginally
// across PE grades — PE4710 is ~0.95). Industry datasheets quote a
// nominal 0.96 for weight estimation; the second-decimal variation
// is well below the accuracy of any RFQ-stage take-off.
const HDPE_DENSITY_KG_DM3 = 0.96;
// uPVC density typically 1.38–1.45 kg/dm³ depending on additive
// package. ISO 1452 / SANS 966 design tables use 1.40 as the
// reference. Higher than HDPE → PVC pipes weigh roughly 1.46x an
// HDPE pipe of identical OD/SDR.
const PVC_DENSITY_KG_DM3 = 1.4;

@Injectable()
export class RfqCalculationService {
  private readonly logger = new Logger(RfqCalculationService.name);

  constructor(
    private boltMassRepository: BoltMassRepository,
    private nutMassRepository: NutMassRepository,
    private referenceDataCache: ReferenceDataCacheService,
  ) {}

  async calculateStraightPipeRequirements(
    dto: UnifiedStraightPipeDto,
  ): Promise<StraightPipeCalculationResultDto> {
    // HDPE pipes are dimensioned by SDR (Standard Dimension Ratio),
    // not by steel pipe schedules — wall thickness = OD / SDR, and
    // they're typically butt-fused (no flanges/bolts). Route them
    // through a dedicated branch so the steel pipe_dimensions
    // lookup is skipped entirely.
    if (dto.materialType === "hdpe") {
      return this.calculateHdpeStraightPipeRequirements(dto);
    }
    // PVC pipes also use SDR (or Pressure Class) and have no
    // pipe_dimensions table; same shape as HDPE, different density.
    if (dto.materialType === "pvc") {
      return this.calculatePvcStraightPipeRequirements(dto);
    }

    const steelSpec = dto.steelSpecificationId
      ? this.referenceDataCache.steelSpecificationById(dto.steelSpecificationId)
      : null;

    if (dto.steelSpecificationId && !steelSpec) {
      throw new NotFoundException(
        `Steel specification with ID ${dto.steelSpecificationId} not found`,
      );
    }

    const normalizedSchedule = dto.scheduleNumber
      ? this.normalizeScheduleNumber(dto.scheduleNumber)
      : null;

    let pipeDimension: PipeDimension | null | undefined = null;
    if (dto.scheduleType === ScheduleType.SCHEDULE && normalizedSchedule) {
      pipeDimension = this.referenceDataCache.pipeDimensionByNbAndSchedule(
        dto.nominalBoreMm,
        normalizedSchedule,
        steelSpec?.id,
      );
    } else if (dto.scheduleType === ScheduleType.WALL_THICKNESS && dto.wallThicknessMm) {
      pipeDimension = this.referenceDataCache.pipeDimensionByNbAndWallThickness(
        dto.nominalBoreMm,
        dto.wallThicknessMm,
        steelSpec?.id,
      );
    }

    if (!pipeDimension) {
      const scheduleInfo =
        dto.scheduleType === ScheduleType.SCHEDULE && dto.scheduleNumber
          ? `schedule ${dto.scheduleNumber}${dto.scheduleNumber !== normalizedSchedule ? ` (normalized to: ${normalizedSchedule})` : ""}`
          : `wall thickness ${dto.wallThicknessMm}mm`;

      throw new NotFoundException(
        `The combination of ${dto.nominalBoreMm}NB with ${scheduleInfo} is not available in the database.\n\nPlease select a different schedule (STD, XS, XXS, 40, 80, 120, 160, MEDIUM, or HEAVY) or use the automated calculation by setting working pressure.`,
      );
    }

    const nbNpsLookup = this.referenceDataCache.nbNpsLookupByNb(dto.nominalBoreMm);
    if (!nbNpsLookup) {
      throw new NotFoundException(`NB-NPS lookup not found for ${dto.nominalBoreMm}NB`);
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;
    const wallThicknessMm = pipeDimension.wall_thickness_mm;

    let pipeWeightPerMeter: number;
    if (pipeDimension.mass_kgm && pipeDimension.mass_kgm > 0) {
      pipeWeightPerMeter = pipeDimension.mass_kgm;
    } else {
      pipeWeightPerMeter =
        (Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * STEEL_DENSITY_KG_DM3) /
        1000;
    }

    let individualPipeLengthM = dto.individualPipeLength;
    if (dto.lengthUnit === LengthUnit.FEET) {
      individualPipeLengthM = dto.individualPipeLength * 0.3048;
    }

    let calculatedPipeCount: number;
    let calculatedTotalLengthM: number;

    if (dto.quantityType === QuantityType.TOTAL_LENGTH) {
      let totalLengthM = dto.quantityValue;
      if (dto.lengthUnit === LengthUnit.FEET) {
        totalLengthM = dto.quantityValue * 0.3048;
      }
      calculatedTotalLengthM = totalLengthM;
      calculatedPipeCount = Math.ceil(totalLengthM / individualPipeLengthM);
    } else {
      calculatedPipeCount = dto.quantityValue;
      calculatedTotalLengthM = calculatedPipeCount * individualPipeLengthM;
    }

    const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLengthM;

    const numberOfFlanges = calculatedPipeCount * 2;
    const numberOfFlangeWelds = numberOfFlanges;
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * 2 * circumferenceM;
    const numberOfButtWelds = 0;
    const totalButtWeldLength = 0;

    let totalFlangeWeight = 0;
    let totalBoltWeight = 0;
    let totalNutWeight = 0;

    if (dto.flangeStandardId && dto.flangePressureClassId) {
      try {
        const flangeDimension = this.referenceDataCache.flangeDimension(
          dto.nominalBoreMm,
          dto.flangeStandardId,
          dto.flangePressureClassId,
        );

        if (flangeDimension) {
          totalFlangeWeight = numberOfFlanges * flangeDimension.mass_kg;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);

            const boltMass = await this.boltMassRepository.findClosestByBoltAndMinLength(
              flangeDimension.bolt.id,
              estimatedBoltLengthMm,
            );

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            const nutMass = await this.nutMassRepository.findByBoltId(flangeDimension.bolt.id);

            if (nutMass) {
              const totalNuts = numberOfFlanges * flangeDimension.num_holes;
              totalNutWeight = totalNuts * nutMass.mass_kg;
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Flange weight calculation failed: ${error.message}. ` +
            `Flange Standard ID: ${dto.flangeStandardId}, ` +
            `Pressure Class ID: ${dto.flangePressureClassId}, ` +
            `Nominal Bore: ${dto.nominalBoreMm}`,
        );
      }
    }

    const totalSystemWeight =
      totalPipeWeight + totalFlangeWeight + totalBoltWeight + totalNutWeight;

    return {
      outsideDiameterMm,
      wallThicknessMm,
      pipeWeightPerMeter: Math.round(pipeWeightPerMeter * 100) / 100,
      totalPipeWeight: Math.round(totalPipeWeight),
      totalFlangeWeight: Math.round(totalFlangeWeight * 100) / 100,
      totalBoltWeight: Math.round(totalBoltWeight * 100) / 100,
      totalNutWeight: Math.round(totalNutWeight * 100) / 100,
      totalSystemWeight: Math.round(totalSystemWeight),
      calculatedPipeCount,
      calculatedTotalLength: Math.round(calculatedTotalLengthM * 100) / 100,
      numberOfFlanges,
      numberOfButtWelds,
      totalButtWeldLength,
      numberOfFlangeWelds,
      totalFlangeWeldLength: Math.round(totalFlangeWeldLength * 100) / 100,
    };
  }

  // HDPE branch of calculateStraightPipeRequirements. Kept separate
  // because the calc is structurally simpler: no pipe_dimensions
  // table, no flange/bolt/nut weights, weight derived from SDR.
  // For HDPE, nominalBoreMm carries the nominal OD (the industry
  // norm — HDPE is specified by OD, not internal bore).
  private async calculateHdpeStraightPipeRequirements(
    dto: UnifiedStraightPipeDto,
  ): Promise<StraightPipeCalculationResultDto> {
    if (!dto.hdpeSdr || dto.hdpeSdr <= 0) {
      throw new NotFoundException(
        `HDPE pipe at ${dto.nominalBoreMm}NB is missing SDR. ` +
          "Set hdpeSdr on the item (or in globalSpecs) so wall thickness can be derived.",
      );
    }

    const outsideDiameterMm = dto.nominalBoreMm;
    const wallThicknessMm = outsideDiameterMm / dto.hdpeSdr;
    const pipeWeightPerMeter =
      (Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * HDPE_DENSITY_KG_DM3) /
      1000;

    let individualPipeLengthM = dto.individualPipeLength;
    if (dto.lengthUnit === LengthUnit.FEET) {
      individualPipeLengthM = dto.individualPipeLength * 0.3048;
    }

    let calculatedPipeCount: number;
    let calculatedTotalLengthM: number;
    if (dto.quantityType === QuantityType.TOTAL_LENGTH) {
      let totalLengthM = dto.quantityValue;
      if (dto.lengthUnit === LengthUnit.FEET) {
        totalLengthM = dto.quantityValue * 0.3048;
      }
      calculatedTotalLengthM = totalLengthM;
      calculatedPipeCount = Math.ceil(totalLengthM / individualPipeLengthM);
    } else {
      calculatedPipeCount = dto.quantityValue;
      calculatedTotalLengthM = calculatedPipeCount * individualPipeLengthM;
    }

    const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLengthM;

    // HDPE is butt-fused (or electrofused) joint-to-joint — no
    // physical flanges/bolts unless a transition flange is called
    // out. Report joint count via numberOfButtWelds for downstream
    // consumers that still want a weld count.
    const numberOfButtWelds = Math.max(0, calculatedPipeCount - 1);
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalButtWeldLength = numberOfButtWelds * circumferenceM;

    return {
      outsideDiameterMm,
      wallThicknessMm: Math.round(wallThicknessMm * 100) / 100,
      pipeWeightPerMeter: Math.round(pipeWeightPerMeter * 100) / 100,
      totalPipeWeight: Math.round(totalPipeWeight),
      totalFlangeWeight: 0,
      totalBoltWeight: 0,
      totalNutWeight: 0,
      totalSystemWeight: Math.round(totalPipeWeight),
      calculatedPipeCount,
      calculatedTotalLength: Math.round(calculatedTotalLengthM * 100) / 100,
      numberOfFlanges: 0,
      numberOfButtWelds,
      totalButtWeldLength: Math.round(totalButtWeldLength * 100) / 100,
      numberOfFlangeWelds: 0,
      totalFlangeWeldLength: 0,
    };
  }

  // PVC straight-pipe branch. Structurally identical to the HDPE
  // branch — SDR-derived wall thickness, no flange/bolt/nut
  // weights — but with PVC density (1.40 vs 0.96 kg/dm³). For PVC,
  // nominalBoreMm is the nominal OD (PVC pressure pipe per
  // ISO 1452 / SANS 966 is sized by OD).
  private async calculatePvcStraightPipeRequirements(
    dto: UnifiedStraightPipeDto,
  ): Promise<StraightPipeCalculationResultDto> {
    // Prefer explicit pvcSdr; fall back to hdpeSdr if the entry
    // came in via the HDPE path by mistake (e.g. NIX called it
    // "polymer"). Last-resort fallback is SDR 21 (~PN10), the
    // most common pressure-pipe rung in the SA market.
    const sdr = dto.pvcSdr ?? dto.hdpeSdr ?? 21;
    if (sdr <= 0) {
      throw new NotFoundException(
        `PVC pipe at ${dto.nominalBoreMm}NB has an invalid SDR (${sdr}).`,
      );
    }

    const outsideDiameterMm = dto.nominalBoreMm;
    const wallThicknessMm = outsideDiameterMm / sdr;
    const pipeWeightPerMeter =
      (Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * PVC_DENSITY_KG_DM3) /
      1000;

    let individualPipeLengthM = dto.individualPipeLength;
    if (dto.lengthUnit === LengthUnit.FEET) {
      individualPipeLengthM = dto.individualPipeLength * 0.3048;
    }

    let calculatedPipeCount: number;
    let calculatedTotalLengthM: number;
    if (dto.quantityType === QuantityType.TOTAL_LENGTH) {
      let totalLengthM = dto.quantityValue;
      if (dto.lengthUnit === LengthUnit.FEET) {
        totalLengthM = dto.quantityValue * 0.3048;
      }
      calculatedTotalLengthM = totalLengthM;
      calculatedPipeCount = Math.ceil(totalLengthM / individualPipeLengthM);
    } else {
      calculatedPipeCount = dto.quantityValue;
      calculatedTotalLengthM = calculatedPipeCount * individualPipeLengthM;
    }

    const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLengthM;

    // PVC pressure-pipe joints are typically solvent-welded sockets
    // or rubber-ring spigots, not butt-fused — but for downstream
    // consumers that want a joint count we still report
    // numberOfButtWelds = pipeCount - 1. The "weld length" is
    // useful as a proxy for joint material / labour.
    const numberOfButtWelds = Math.max(0, calculatedPipeCount - 1);
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalButtWeldLength = numberOfButtWelds * circumferenceM;

    return {
      outsideDiameterMm,
      wallThicknessMm: Math.round(wallThicknessMm * 100) / 100,
      pipeWeightPerMeter: Math.round(pipeWeightPerMeter * 100) / 100,
      totalPipeWeight: Math.round(totalPipeWeight),
      totalFlangeWeight: 0,
      totalBoltWeight: 0,
      totalNutWeight: 0,
      totalSystemWeight: Math.round(totalPipeWeight),
      calculatedPipeCount,
      calculatedTotalLength: Math.round(calculatedTotalLengthM * 100) / 100,
      numberOfFlanges: 0,
      numberOfButtWelds,
      totalButtWeldLength: Math.round(totalButtWeldLength * 100) / 100,
      numberOfFlangeWelds: 0,
      totalFlangeWeldLength: 0,
    };
  }

  async calculateBendRequirements(dto: CreateBendRfqDto): Promise<BendCalculationResultDto> {
    // HDPE bends are dimensioned by SDR and have no schedule
    // number / steel-density assumption. Route them through a
    // dedicated branch so the steel formula doesn't over-estimate
    // their weight by ~8x (HDPE density 0.96 vs steel 7.85).
    if (dto.materialType === "hdpe") {
      return this.calculateHdpeBendRequirements(dto);
    }
    // PVC bends — same geometry model as HDPE bends, different
    // density. Branch separately so we can keep distinct fallback
    // SDRs (PVC defaults to 21 = PN10; HDPE defaults to 11 = PN16).
    if (dto.materialType === "pvc") {
      return this.calculatePvcBendRequirements(dto);
    }

    const weightBreakdown = this.bendWeight(dto);
    const centerToFace = this.centerToFace(dto);
    const numberOfFlanges = dto.numberOfTangents + 1;

    const flangeDim =
      dto.flangeStandardId && dto.flangePressureClassId
        ? this.referenceDataCache.flangeDimension(
            dto.nominalBoreMm,
            dto.flangeStandardId,
            dto.flangePressureClassId,
          )
        : null;
    const flangeMassKg = flangeDim?.mass_kg || 0;
    const flangeWeight = flangeMassKg * numberOfFlanges;

    const nbLookup = this.referenceDataCache.nbNpsLookupByNb(dto.nominalBoreMm);
    const od = nbLookup?.outside_diameter_mm || dto.nominalBoreMm * 1.25;

    return {
      totalWeight: weightBreakdown.totalWeight + flangeWeight,
      centerToFaceDimension: centerToFace,
      bendWeight: weightBreakdown.bendBodyWeight,
      tangentWeight: weightBreakdown.tangentWeight,
      flangeWeight,
      numberOfFlanges,
      numberOfFlangeWelds: dto.numberOfTangents,
      totalFlangeWeldLength: (dto.numberOfTangents * Math.PI * dto.nominalBoreMm) / 1000,
      numberOfButtWelds: dto.numberOfTangents > 0 ? 1 : 0,
      totalButtWeldLength: dto.numberOfTangents > 0 ? (Math.PI * dto.nominalBoreMm) / 1000 : 0,
      outsideDiameterMm: od,
      wallThicknessMm: this.wallThicknessFromSchedule(dto.scheduleNumber),
    };
  }

  // HDPE branch of calculateBendRequirements. HDPE bends are
  // butt-fused (no flanges/bolts) and dimensioned by SDR rather
  // than steel schedule. nominalBoreMm carries the nominal OD
  // (industry norm — HDPE is sized by OD). Falls back to SDR=11
  // (PE100 PN16) when the entry doesn't supply one.
  //
  // Bend body weight uses the toroidal-arc model from Grok's
  // HDPE weight reference:
  //   - Centerline arc length = R_bend × bendAngleRadians where
  //     R_bend = OD × bendTypeMultiplier (parsed from "3D",
  //     "1.5D" etc.; default 1.5D when missing).
  //   - Shell volume ≈ π × OD × t × arc_length (thin-wall hollow
  //     cylinder swept along the arc — accurate to within a few
  //     percent for SDR ≤ 17).
  //   - Mass = volume × density.
  // Tangent legs are modelled as straight HDPE pipe sections via
  // the same π·OD·t·L·ρ formula. The legacy steel branch used a
  // density-of-steel constant; here we use HDPE_DENSITY_KG_DM3
  // throughout.
  private async calculateHdpeBendRequirements(
    dto: CreateBendRfqDto,
  ): Promise<BendCalculationResultDto> {
    const outsideDiameterMm = dto.nominalBoreMm;
    const sdr = dto.hdpeSdr && dto.hdpeSdr > 0 ? dto.hdpeSdr : 11;
    const wallThicknessMm = outsideDiameterMm / sdr;

    // Parse bendType like "3D" / "1.5D" → multiplier. Default 1.5
    // (long-radius elbow, the most common HDPE bend).
    const bendTypeMultiplier =
      dto.bendType && /^(\d+(?:\.\d+)?)D$/.test(dto.bendType)
        ? Number.parseFloat(dto.bendType.replace("D", ""))
        : 1.5;
    const bendRadiusMm = outsideDiameterMm * bendTypeMultiplier;
    const bendDegrees = dto.bendDegrees || 90;
    const arcLengthM = (bendRadiusMm * (bendDegrees * Math.PI)) / 180 / 1000;
    // π × OD(mm) × t(mm) × arcLength(m) × ρ(kg/dm³) / 1000
    // → kg. Unit dance: mm × mm × m × kg/dm³ ÷ 1000 = kg, given
    // 1 dm³ = 1000 cm³ = 1e6 mm³ ÷ 1e3 = volume in mm² × m
    // matches once divided by 1000.
    const bendBodyWeight =
      (Math.PI * outsideDiameterMm * wallThicknessMm * arcLengthM * HDPE_DENSITY_KG_DM3) / 1000;

    const tangentLengths = dto.tangentLengths || [];
    const tangentWeight = tangentLengths.reduce((total, length) => {
      // Same hollow-cylinder formula for each straight tangent leg.
      return (
        total +
        (Math.PI * outsideDiameterMm * wallThicknessMm * (length / 1000) * HDPE_DENSITY_KG_DM3) /
          1000
      );
    }, 0);
    const totalWeight = bendBodyWeight + tangentWeight;

    return {
      totalWeight: Math.round(totalWeight * 100) / 100,
      centerToFaceDimension: this.centerToFace(dto),
      bendWeight: Math.round(bendBodyWeight * 100) / 100,
      tangentWeight: Math.round(tangentWeight * 100) / 100,
      flangeWeight: 0,
      numberOfFlanges: 0,
      numberOfFlangeWelds: 0,
      totalFlangeWeldLength: 0,
      // HDPE bends are typically fused to the adjacent pipes —
      // count each tangent end as a butt-fusion joint.
      numberOfButtWelds: tangentLengths.length,
      totalButtWeldLength:
        tangentLengths.length > 0
          ? (tangentLengths.length * Math.PI * outsideDiameterMm) / 1000
          : 0,
      outsideDiameterMm,
      wallThicknessMm: Math.round(wallThicknessMm * 100) / 100,
    };
  }

  // PVC bend branch — same geometry model as the HDPE one (toroidal
  // arc body + straight pipe tangents), only the density and the
  // default SDR fallback differ. PVC bends are typically moulded
  // (not fabricated from mitred pipe segments like HDPE), so the
  // estimate has slightly more variance vs the datasheet weight,
  // but stays within the ±15% quoting band.
  private async calculatePvcBendRequirements(
    dto: CreateBendRfqDto,
  ): Promise<BendCalculationResultDto> {
    const outsideDiameterMm = dto.nominalBoreMm;
    const sdr = dto.pvcSdr && dto.pvcSdr > 0 ? dto.pvcSdr : 21;
    const wallThicknessMm = outsideDiameterMm / sdr;

    const bendTypeMultiplier =
      dto.bendType && /^(\d+(?:\.\d+)?)D$/.test(dto.bendType)
        ? Number.parseFloat(dto.bendType.replace("D", ""))
        : 1.5;
    const bendRadiusMm = outsideDiameterMm * bendTypeMultiplier;
    const bendDegrees = dto.bendDegrees || 90;
    const arcLengthM = (bendRadiusMm * (bendDegrees * Math.PI)) / 180 / 1000;
    const bendBodyWeight =
      (Math.PI * outsideDiameterMm * wallThicknessMm * arcLengthM * PVC_DENSITY_KG_DM3) / 1000;

    const tangentLengths = dto.tangentLengths || [];
    const tangentWeight = tangentLengths.reduce((total, length) => {
      return (
        total +
        (Math.PI * outsideDiameterMm * wallThicknessMm * (length / 1000) * PVC_DENSITY_KG_DM3) /
          1000
      );
    }, 0);
    const totalWeight = bendBodyWeight + tangentWeight;

    return {
      totalWeight: Math.round(totalWeight * 100) / 100,
      centerToFaceDimension: this.centerToFace(dto),
      bendWeight: Math.round(bendBodyWeight * 100) / 100,
      tangentWeight: Math.round(tangentWeight * 100) / 100,
      flangeWeight: 0,
      numberOfFlanges: 0,
      numberOfFlangeWelds: 0,
      totalFlangeWeldLength: 0,
      numberOfButtWelds: tangentLengths.length,
      totalButtWeldLength:
        tangentLengths.length > 0
          ? (tangentLengths.length * Math.PI * outsideDiameterMm) / 1000
          : 0,
      outsideDiameterMm,
      wallThicknessMm: Math.round(wallThicknessMm * 100) / 100,
    };
  }

  async calculatePumpRequirements(dto: CreatePumpRfqDto): Promise<PumpCalculationResultDto> {
    const flowRate = dto.flowRate || 0;
    const totalHead = dto.totalHead || 0;
    const specificGravity = dto.specificGravity || 1.0;

    const hydraulicPowerKw = (flowRate * totalHead * specificGravity * 9.81) / 3600;
    const estimatedEfficiency = this.pumpEfficiency(flowRate, totalHead, dto.pumpType);

    if (estimatedEfficiency <= 0) {
      return {
        hydraulicPowerKw: Math.round(hydraulicPowerKw * 100) / 100,
        estimatedMotorPowerKw: 0,
        estimatedEfficiency: 0,
        specificSpeed: 0,
        recommendedPumpType: "Unknown",
        npshRequired: 0,
        bepFlowRate: 0,
        bepHead: 0,
        operatingPointPercentBep: 0,
        warnings: ["Pump efficiency could not be estimated. Check flow rate and head inputs."],
        recommendations: [],
      };
    }

    const estimatedMotorPowerKw = hydraulicPowerKw / (estimatedEfficiency / 100);
    const specificSpeed = this.specificSpeed(flowRate, totalHead);
    const recommendedPumpType = this.recommendedPumpType(specificSpeed);
    const npshRequired = this.npshRequired(flowRate, specificSpeed);

    const bepFlowRate = flowRate * 1.1;
    const bepHead = totalHead * 1.05;
    const operatingPointPercentBep = bepFlowRate <= 0 ? 0 : (flowRate / bepFlowRate) * 100;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (dto.npshAvailable && dto.npshAvailable < npshRequired * 1.3) {
      warnings.push(
        `NPSHa (${dto.npshAvailable}m) is close to NPSHr (${npshRequired.toFixed(2)}m). Risk of cavitation.`,
      );
    }

    if (operatingPointPercentBep < 70 || operatingPointPercentBep > 120) {
      warnings.push(
        `Operating point (${operatingPointPercentBep.toFixed(0)}% of BEP) is outside optimal range (70-120%).`,
      );
    }

    if (dto.viscosity && dto.viscosity > 100) {
      recommendations.push("Consider positive displacement pump for high viscosity fluids.");
    }

    if (dto.solidsContent && dto.solidsContent > 10) {
      recommendations.push(
        "Consider slurry pump or recessed impeller design for high solids content.",
      );
    }

    if (dto.isAbrasive) {
      recommendations.push(
        "Use hardened materials (high chrome, ceramic, or rubber-lined) for abrasive service.",
      );
    }

    if (dto.isCorrosive) {
      recommendations.push(
        "Select corrosion-resistant materials appropriate for the specific chemical.",
      );
    }

    if (specificSpeed < 500) {
      recommendations.push("Low specific speed - consider radial flow centrifugal pump.");
    } else if (specificSpeed > 10000) {
      recommendations.push("High specific speed - consider axial flow pump or mixed flow design.");
    }

    return {
      hydraulicPowerKw: Math.round(hydraulicPowerKw * 100) / 100,
      estimatedMotorPowerKw: Math.round(estimatedMotorPowerKw * 100) / 100,
      estimatedEfficiency: Math.round(estimatedEfficiency * 10) / 10,
      specificSpeed: Math.round(specificSpeed),
      recommendedPumpType,
      npshRequired: Math.round(npshRequired * 100) / 100,
      bepFlowRate: Math.round(bepFlowRate * 10) / 10,
      bepHead: Math.round(bepHead * 10) / 10,
      operatingPointPercentBep: Math.round(operatingPointPercentBep),
      warnings,
      recommendations,
    };
  }

  private normalizeScheduleNumber(scheduleNumber: string): string {
    if (!scheduleNumber) return scheduleNumber;
    const schMatch = scheduleNumber.match(/^[Ss]ch\s*(\d+)(?:\/\w+)?$/);
    if (schMatch) return schMatch[1];
    const numMatch = scheduleNumber.match(/^(\d+)(?:\/\w+)?$/);
    if (numMatch) return numMatch[1];
    return scheduleNumber;
  }

  private bendWeight(dto: CreateBendRfqDto): {
    bendBodyWeight: number;
    tangentWeight: number;
    totalWeight: number;
  } {
    // Real geometry, replacing the original NB-only placeholder
    // ((NB/25)^2 * 2) that priced a 300NB 90deg bend at 288 kg vs the
    // ~48 kg a 610mm-radius arc of 300NB x 6mm actually weighs.
    const nbLookup = this.referenceDataCache.nbNpsLookupByNb(dto.nominalBoreMm);
    const rawOdMm = nbLookup?.outside_diameter_mm;
    const outsideDiameterMm = rawOdMm || dto.nominalBoreMm * 1.05;
    const wallThicknessMm = this.wallThicknessFromSchedule(dto.scheduleNumber);
    // Standard mass formula: ((OD - WT) * WT) * 0.02466 = kg/m
    const kgPerMeter = (outsideDiameterMm - wallThicknessMm) * wallThicknessMm * 0.02466;

    // Centerline arc = bend radius x angle; radius from the bend type
    // multiplier ("2D" -> 2 x nominal diameter), matching centerToFace().
    const multiplier = dto.bendType
      ? Number.parseFloat(dto.bendType.replace("D", "")) || 1.5
      : 1.5;
    const radiusMm = dto.nominalBoreMm * multiplier;
    const bendDegrees = dto.bendDegrees || 90;
    const arcLengthM = (radiusMm * ((bendDegrees * Math.PI) / 180)) / 1000;
    const bendBodyWeight = kgPerMeter * arcLengthM;

    const tangentWeight = dto.tangentLengths.reduce((total, length) => {
      return total + (length / 1000) * kgPerMeter;
    }, 0);
    return { bendBodyWeight, tangentWeight, totalWeight: bendBodyWeight + tangentWeight };
  }

  private centerToFace(dto: CreateBendRfqDto): number {
    if (!dto.bendType) return dto.nominalBoreMm * 1.5;
    const multiplier = parseFloat(dto.bendType.replace("D", "")) || 1.5;
    const radius = dto.nominalBoreMm * multiplier;
    return radius * Math.sin((dto.bendDegrees * Math.PI) / 180 / 2);
  }

  private wallThicknessFromSchedule(scheduleNumber: string): number {
    // SABS 719 style schedules carry the wall thickness directly
    // ("WT6", "WT4.5 (4.5mm)") — parse it rather than falling through
    // to the Sch40 default.
    const wtMatch = scheduleNumber?.match(/^WT(\d+(?:\.\d+)?)/i);
    if (wtMatch) return Number.parseFloat(wtMatch[1]);
    const scheduleMap: { [key: string]: number } = {
      Sch10: 2.77,
      Sch20: 3.91,
      Sch30: 5.54,
      Sch40: 6.35,
      Sch80: 8.74,
      Sch160: 14.27,
    };
    return scheduleMap[scheduleNumber] || 6.35;
  }

  private pumpEfficiency(flowRate: number, head: number, pumpType: string): number {
    let baseEfficiency = 70;
    if (flowRate > 100) {
      baseEfficiency += Math.min(15, Math.log10(flowRate / 100) * 10);
    } else if (flowRate < 10) {
      baseEfficiency -= 15;
    }
    if (head > 100) {
      baseEfficiency -= Math.min(10, (head - 100) / 50);
    }
    if (pumpType.includes("multistage") || pumpType.includes("positive_displacement")) {
      baseEfficiency -= 5;
    }
    return Math.max(30, Math.min(90, baseEfficiency));
  }

  private specificSpeed(flowRate: number, head: number): number {
    if (head <= 0 || flowRate <= 0) return 0;
    const n = 2900;
    return (n * Math.sqrt(flowRate)) / head ** 0.75;
  }

  private recommendedPumpType(specificSpeed: number): string {
    if (specificSpeed < 500) return "Radial flow centrifugal pump";
    if (specificSpeed < 2000) return "End suction centrifugal pump";
    if (specificSpeed < 5000) return "Mixed flow pump";
    if (specificSpeed < 10000) return "Axial flow pump";
    return "Propeller pump or axial flow design";
  }

  private npshRequired(flowRate: number, specificSpeed: number): number {
    const baseNpsh = 2.5;
    const flowFactor = (flowRate / 100) ** 0.33;
    const speedFactor = specificSpeed > 2000 ? 1.2 : 1.0;
    return baseNpsh * flowFactor * speedFactor;
  }
}
