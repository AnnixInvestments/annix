import { Injectable, Logger } from "@nestjs/common";
import {
  CalculateReducerAreaDto,
  CalculateReducerMassDto,
  ReducerAreaResultDto,
  ReducerFullCalculationDto,
  ReducerFullResultDto,
  ReducerMassResultDto,
  ReducerType,
} from "./dto/calculate-reducer.dto";

/**
 * Reducer Calculator Service
 *
 * Implements the Graham Dell calculator formulas for reducer fittings.
 *
 * A reducer is a frustum (truncated cone) connecting two different pipe diameters.
 * - Concentric: Both ends share the same centerline
 * - Eccentric: One side is flat (offset centerlines)
 *
 * Key formulas:
 * - Frustum volume: V = (π/12) × h × (D² + D×d + d²)
 * - Slant height: s = √((R - r)² + h²)
 * - Lateral surface area: A = π × s × (R + r)
 */
@Injectable()
export class ReducerCalculatorService {
  private readonly logger = new Logger(ReducerCalculatorService.name);

  private static readonly DEFAULT_STEEL_DENSITY_KG_M3 = 7850;
  private static readonly PI_OVER_12 = Math.PI / 12;

  /**
   * Calculate the mass/weight of a reducer fitting
   *
   * Uses the frustum volume formula:
   * V = (π/12) × L × (D² + D×d + d²)
   *
   * Where:
   * - L = centreline length
   * - D = large diameter
   * - d = small diameter
   *
   * Mass is calculated as the difference between outer and inner frustum volumes
   * multiplied by the steel density.
   */
  calculateMass(dto: CalculateReducerMassDto): ReducerMassResultDto {
    const density = dto.densityKgM3 ?? ReducerCalculatorService.DEFAULT_STEEL_DENSITY_KG_M3;
    const quantity = dto.quantity ?? 1;
    const reducerType = dto.reducerType ?? ReducerType.CONCENTRIC;

    const largeDiameterMm = dto.largeDiameterMm;
    const smallDiameterMm = dto.smallDiameterMm;
    const lengthMm = dto.lengthMm;
    const wallThicknessMm = dto.wallThicknessMm;

    const largeInnerDiameterMm = largeDiameterMm - 2 * wallThicknessMm;
    const smallInnerDiameterMm = smallDiameterMm - 2 * wallThicknessMm;

    const outerVolumeM3 = this.frustumVolume(largeDiameterMm, smallDiameterMm, lengthMm);
    const innerVolumeM3 = this.frustumVolume(largeInnerDiameterMm, smallInnerDiameterMm, lengthMm);
    const steelVolumeM3 = outerVolumeM3 - innerVolumeM3;

    const massPerUnitKg = steelVolumeM3 * density;
    const totalMassKg = massPerUnitKg * quantity;

    this.logger.debug(
      `Reducer mass calculation: ${largeDiameterMm}×${smallDiameterMm}×${lengthMm}mm, ` +
        `WT=${wallThicknessMm}mm, V_steel=${steelVolumeM3.toFixed(6)}m³, ` +
        `mass=${massPerUnitKg.toFixed(2)}kg × ${quantity} = ${totalMassKg.toFixed(2)}kg`,
    );

    return {
      largeDiameterMm,
      smallDiameterMm,
      largeInnerDiameterMm: this.round(largeInnerDiameterMm, 2),
      smallInnerDiameterMm: this.round(smallInnerDiameterMm, 2),
      lengthMm,
      wallThicknessMm,
      densityKgM3: density,
      outerVolumeM3: this.round(outerVolumeM3, 6),
      innerVolumeM3: this.round(innerVolumeM3, 6),
      steelVolumeM3: this.round(steelVolumeM3, 6),
      massPerUnitKg: this.round(massPerUnitKg, 2),
      totalMassKg: this.round(totalMassKg, 2),
      quantity,
      reducerType,
    };
  }

  /**
   * Calculate the surface areas of a reducer fitting
   *
   * Uses the frustum lateral surface area formula:
   * A = π × s × (R + r)
   *
   * Where:
   * - s = slant height = √((R - r)² + h²)
   * - R = large radius
   * - r = small radius
   *
   * Also calculates areas for optional straight pipe extensions at each end.
   */
  calculateArea(dto: CalculateReducerAreaDto): ReducerAreaResultDto {
    const quantity = dto.quantity ?? 1;
    const reducerType = dto.reducerType ?? ReducerType.CONCENTRIC;

    const largeDiameterMm = dto.largeDiameterMm;
    const smallDiameterMm = dto.smallDiameterMm;
    const lengthMm = dto.lengthMm;
    const wallThicknessMm = dto.wallThicknessMm;

    const largeInnerDiameterMm = largeDiameterMm - 2 * wallThicknessMm;
    const smallInnerDiameterMm = smallDiameterMm - 2 * wallThicknessMm;

    const largeRadiusMm = largeDiameterMm / 2;
    const smallRadiusMm = smallDiameterMm / 2;
    const largeInnerRadiusMm = largeInnerDiameterMm / 2;
    const smallInnerRadiusMm = smallInnerDiameterMm / 2;

    const slantHeightMm = this.slantHeight(largeRadiusMm, smallRadiusMm, lengthMm);
    const slantHeightInnerMm = this.slantHeight(largeInnerRadiusMm, smallInnerRadiusMm, lengthMm);

    const coneAngleRadians = Math.atan((largeRadiusMm - smallRadiusMm) / lengthMm);
    const coneAngleDegrees = (coneAngleRadians * 180) / Math.PI;

    const reducerExternalAreaM2 = this.frustumLateralArea(
      largeDiameterMm,
      smallDiameterMm,
      slantHeightMm,
    );
    const reducerInternalAreaM2 = this.frustumLateralArea(
      largeInnerDiameterMm,
      smallInnerDiameterMm,
      slantHeightInnerMm,
    );

    const extensionLargeMm = dto.extensionLargeMm ?? 0;
    const extensionSmallMm = dto.extensionSmallMm ?? 0;
    const extensionLargeWallThicknessMm = dto.extensionLargeWallThicknessMm ?? wallThicknessMm;
    const extensionSmallWallThicknessMm = dto.extensionSmallWallThicknessMm ?? wallThicknessMm;

    const extensionLargeExternalAreaM2 = this.cylinderLateralArea(
      largeDiameterMm,
      extensionLargeMm,
    );
    const extensionLargeInternalAreaM2 = this.cylinderLateralArea(
      largeDiameterMm - 2 * extensionLargeWallThicknessMm,
      extensionLargeMm,
    );

    const extensionSmallExternalAreaM2 = this.cylinderLateralArea(
      smallDiameterMm,
      extensionSmallMm,
    );
    const extensionSmallInternalAreaM2 = this.cylinderLateralArea(
      smallDiameterMm - 2 * extensionSmallWallThicknessMm,
      extensionSmallMm,
    );

    const totalExternalAreaM2 =
      (reducerExternalAreaM2 + extensionLargeExternalAreaM2 + extensionSmallExternalAreaM2) *
      quantity;
    const totalInternalAreaM2 =
      (reducerInternalAreaM2 + extensionLargeInternalAreaM2 + extensionSmallInternalAreaM2) *
      quantity;
    const totalCombinedAreaM2 = totalExternalAreaM2 + totalInternalAreaM2;

    const areaPerUnitM2 =
      reducerExternalAreaM2 +
      reducerInternalAreaM2 +
      extensionLargeExternalAreaM2 +
      extensionLargeInternalAreaM2 +
      extensionSmallExternalAreaM2 +
      extensionSmallInternalAreaM2;

    this.logger.debug(
      `Reducer area calculation: ${largeDiameterMm}×${smallDiameterMm}×${lengthMm}mm, ` +
        `slant=${slantHeightMm.toFixed(2)}mm, angle=${coneAngleDegrees.toFixed(2)}°, ` +
        `ext=${totalExternalAreaM2.toFixed(4)}m², int=${totalInternalAreaM2.toFixed(4)}m²`,
    );

    return {
      largeDiameterMm,
      smallDiameterMm,
      largeInnerDiameterMm: this.round(largeInnerDiameterMm, 2),
      smallInnerDiameterMm: this.round(smallInnerDiameterMm, 2),
      lengthMm,
      slantHeightMm: this.round(slantHeightMm, 2),
      coneAngleDegrees: this.round(coneAngleDegrees, 2),
      reducerExternalAreaM2: this.round(reducerExternalAreaM2, 4),
      reducerInternalAreaM2: this.round(reducerInternalAreaM2, 4),
      extensionLargeExternalAreaM2: this.round(extensionLargeExternalAreaM2, 4),
      extensionLargeInternalAreaM2: this.round(extensionLargeInternalAreaM2, 4),
      extensionSmallExternalAreaM2: this.round(extensionSmallExternalAreaM2, 4),
      extensionSmallInternalAreaM2: this.round(extensionSmallInternalAreaM2, 4),
      totalExternalAreaM2: this.round(totalExternalAreaM2, 4),
      totalInternalAreaM2: this.round(totalInternalAreaM2, 4),
      totalCombinedAreaM2: this.round(totalCombinedAreaM2, 4),
      areaPerUnitM2: this.round(areaPerUnitM2, 4),
      quantity,
      reducerType,
    };
  }

  /**
   * Calculate both mass and area, plus optional coating costs
   */
  calculateFull(dto: ReducerFullCalculationDto): ReducerFullResultDto {
    const mass = this.calculateMass(dto);
    const area = this.calculateArea(dto);

    const result: ReducerFullResultDto = {
      mass,
      area,
    };

    if (dto.coatingRatePerM2 !== undefined && dto.coatingRatePerM2 > 0) {
      result.externalCoatingCost = this.round(area.totalExternalAreaM2 * dto.coatingRatePerM2, 2);
      result.internalCoatingCost = this.round(area.totalInternalAreaM2 * dto.coatingRatePerM2, 2);
      result.totalCoatingCost = this.round(area.totalCombinedAreaM2 * dto.coatingRatePerM2, 2);
    }

    return result;
  }

  /**
   * Calculate standard reducer dimensions based on nominal bore sizes
   *
   * Returns recommended length based on SABS/ASME standards for
   * concentric and eccentric reducers.
   */
  standardReducerLength(largeNbMm: number, smallNbMm: number): number {
    const standardLengths: Record<number, number> = {
      200: 180,
      250: 205,
      300: 230,
      350: 255,
      400: 280,
      450: 305,
      500: 330,
      550: 355,
      600: 380,
      650: 405,
      700: 430,
      750: 455,
      800: 485,
      850: 510,
      900: 535,
    };

    return standardLengths[largeNbMm] ?? this.estimateReducerLength(largeNbMm, smallNbMm);
  }

  /**
   * Estimate reducer length when not available in standard tables
   *
   * Uses a linear interpolation based on diameter difference
   */
  private estimateReducerLength(largeNbMm: number, smallNbMm: number): number {
    const diameterDifference = largeNbMm - smallNbMm;
    const baseLengthFactor = 1.5;
    return Math.max(100, diameterDifference * baseLengthFactor);
  }

  /**
   * Calculate frustum volume
   *
   * V = (π/12) × h × (D² + D×d + d²)
   *
   * @param largeDiameterMm - Large end diameter in mm
   * @param smallDiameterMm - Small end diameter in mm
   * @param heightMm - Height/length in mm
   * @returns Volume in m³
   */
  private frustumVolume(
    largeDiameterMm: number,
    smallDiameterMm: number,
    heightMm: number,
  ): number {
    const D = largeDiameterMm;
    const d = smallDiameterMm;
    const h = heightMm;

    const volumeMm3 = ReducerCalculatorService.PI_OVER_12 * h * (D * D + D * d + d * d);
    return volumeMm3 / 1e9;
  }

  /**
   * Calculate slant height of frustum
   *
   * s = √((R - r)² + h²)
   *
   * @param largeRadiusMm - Large end radius in mm
   * @param smallRadiusMm - Small end radius in mm
   * @param heightMm - Height/length in mm
   * @returns Slant height in mm
   */
  private slantHeight(largeRadiusMm: number, smallRadiusMm: number, heightMm: number): number {
    const radiusDiff = largeRadiusMm - smallRadiusMm;
    return Math.sqrt(radiusDiff * radiusDiff + heightMm * heightMm);
  }

  /**
   * Calculate lateral surface area of a frustum
   *
   * A = π × s × (R + r) = (π/2) × s × (D + d)
   *
   * @param largeDiameterMm - Large end diameter in mm
   * @param smallDiameterMm - Small end diameter in mm
   * @param slantHeightMm - Slant height in mm
   * @returns Surface area in m²
   */
  private frustumLateralArea(
    largeDiameterMm: number,
    smallDiameterMm: number,
    slantHeightMm: number,
  ): number {
    const areaMm2 = (Math.PI / 2) * slantHeightMm * (largeDiameterMm + smallDiameterMm);
    return areaMm2 / 1e6;
  }

  /**
   * Calculate lateral surface area of a cylinder (pipe extension)
   *
   * A = π × D × L
   *
   * @param diameterMm - Diameter in mm
   * @param lengthMm - Length in mm
   * @returns Surface area in m²
   */
  private cylinderLateralArea(diameterMm: number, lengthMm: number): number {
    if (lengthMm <= 0) return 0;
    const areaMm2 = Math.PI * diameterMm * lengthMm;
    return areaMm2 / 1e6;
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
