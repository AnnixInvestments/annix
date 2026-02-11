import { Injectable, Logger } from "@nestjs/common";
import {
  DEFAULT_WELD_RATE_CONFIG,
  REFERENCE_COSTS_PER_METRE,
  WELD_RUNS_BY_THICKNESS,
  WeldConsumableData,
  WeldConsumableType,
  WeldRateConfig,
} from "./weld-rate.data";

export interface WeldCostBreakdown {
  consumableType: WeldConsumableType;
  gasConsumptionM3PerMetre: number;
  gasCostPerMetre: number;
  fillerCostPerMetre: number;
  laborCostPerMetre: number;
  totalCostPerMetre: number;
  weldTimeMinutesPerMetre: number;
}

export interface WeldCostResult {
  pipeOutsideDiameterMm: number;
  wallThicknessMm: number;
  weldLengthPerRunMm: number;
  numberOfRuns: number;
  totalWeldLengthMm: number;
  consumableType: WeldConsumableType;
  breakdown: WeldCostBreakdown;
  totalCost: number;
  totalTimeMinutes: number;
}

/**
 * Weld Rate Calculator Service
 *
 * Implements the Graham Dell calculator formulas for welding cost estimation.
 * Calculates costs based on consumable type (CO2, Fluxcore, Argon), gas consumption,
 * filler material, and labor rates.
 *
 * NOT YET EXPOSED VIA CONTROLLER - For future use.
 */
@Injectable()
export class WeldRateService {
  private readonly logger = new Logger(WeldRateService.name);
  private readonly config: WeldRateConfig;

  constructor() {
    this.config = DEFAULT_WELD_RATE_CONFIG;
  }

  /**
   * Calculate the cost breakdown per running metre for a given consumable type.
   *
   * Formulas from Graham Dell calculator:
   * - Gas consumption = (flow_rate_L/min / 1000) / weld_rate_m/min
   * - Gas cost = gas_consumption × gas_price_per_m3
   * - Filler cost = filler_price × filler_area
   * - Labor cost = welder_hourly_rate / 60 / weld_rate
   */
  costPerMetre(consumableType: WeldConsumableType): WeldCostBreakdown {
    const consumable = this.config.consumables[consumableType];

    const gasConsumptionM3PerMetre =
      consumable.gasFlowLitresPerMin / 1000 / consumable.weldRateMetresPerMin;

    const gasCostPerMetre = gasConsumptionM3PerMetre * consumable.gasPricePerM3;
    const fillerCostPerMetre = consumable.fillerPricePerKg * consumable.fillerAreaM2;
    const laborCostPerMetre = this.config.welderHourlyRate / 60 / consumable.weldRateMetresPerMin;

    const totalCostPerMetre = gasCostPerMetre + fillerCostPerMetre + laborCostPerMetre;
    const weldTimeMinutesPerMetre = 1 / consumable.weldRateMetresPerMin;

    return {
      consumableType,
      gasConsumptionM3PerMetre: this.round(gasConsumptionM3PerMetre, 4),
      gasCostPerMetre: this.round(gasCostPerMetre, 2),
      fillerCostPerMetre: this.round(fillerCostPerMetre, 2),
      laborCostPerMetre: this.round(laborCostPerMetre, 2),
      totalCostPerMetre: this.round(totalCostPerMetre, 2),
      weldTimeMinutesPerMetre: this.round(weldTimeMinutesPerMetre, 2),
    };
  }

  /**
   * Get the reference cost per metre (pre-calculated from Graham Dell calculator).
   */
  referenceCostPerMetre(consumableType: WeldConsumableType): number {
    return REFERENCE_COSTS_PER_METRE[consumableType];
  }

  /**
   * Determine the number of weld runs required based on wall thickness.
   */
  runsForThickness(wallThicknessMm: number): number {
    for (const entry of WELD_RUNS_BY_THICKNESS) {
      if (wallThicknessMm <= entry.maxThicknessMm) {
        return entry.runs;
      }
    }
    return 6;
  }

  /**
   * Calculate total weld cost for a circumferential weld on a pipe.
   *
   * @param pipeOutsideDiameterMm - Outside diameter of the pipe
   * @param wallThicknessMm - Wall thickness (determines number of runs)
   * @param consumableType - Type of welding consumable
   * @param customRuns - Optional override for number of weld runs
   */
  calculatePipeWeldCost(
    pipeOutsideDiameterMm: number,
    wallThicknessMm: number,
    consumableType: WeldConsumableType = "CO2",
    customRuns?: number,
  ): WeldCostResult {
    const weldLengthPerRunMm = Math.PI * pipeOutsideDiameterMm;
    const numberOfRuns = customRuns ?? this.runsForThickness(wallThicknessMm);
    const totalWeldLengthMm = weldLengthPerRunMm * numberOfRuns;
    const totalWeldLengthMetres = totalWeldLengthMm / 1000;

    const breakdown = this.costPerMetre(consumableType);
    const totalCost = breakdown.totalCostPerMetre * totalWeldLengthMetres;
    const totalTimeMinutes = breakdown.weldTimeMinutesPerMetre * totalWeldLengthMetres;

    this.logger.debug(
      `Pipe weld cost: OD=${pipeOutsideDiameterMm}mm, WT=${wallThicknessMm}mm, ` +
        `${consumableType}, ${numberOfRuns} runs, L=${totalWeldLengthMm.toFixed(0)}mm, ` +
        `Cost=R${totalCost.toFixed(2)}, Time=${totalTimeMinutes.toFixed(1)}min`,
    );

    return {
      pipeOutsideDiameterMm,
      wallThicknessMm,
      weldLengthPerRunMm: this.round(weldLengthPerRunMm, 2),
      numberOfRuns,
      totalWeldLengthMm: this.round(totalWeldLengthMm, 2),
      consumableType,
      breakdown,
      totalCost: this.round(totalCost, 2),
      totalTimeMinutes: this.round(totalTimeMinutes, 1),
    };
  }

  /**
   * Calculate weld cost for a given linear weld length.
   *
   * @param weldLengthMm - Total weld length in mm
   * @param consumableType - Type of welding consumable
   */
  calculateLinearWeldCost(
    weldLengthMm: number,
    consumableType: WeldConsumableType = "CO2",
  ): {
    weldLengthMm: number;
    consumableType: WeldConsumableType;
    breakdown: WeldCostBreakdown;
    totalCost: number;
    totalTimeMinutes: number;
  } {
    const weldLengthMetres = weldLengthMm / 1000;
    const breakdown = this.costPerMetre(consumableType);
    const totalCost = breakdown.totalCostPerMetre * weldLengthMetres;
    const totalTimeMinutes = breakdown.weldTimeMinutesPerMetre * weldLengthMetres;

    return {
      weldLengthMm,
      consumableType,
      breakdown,
      totalCost: this.round(totalCost, 2),
      totalTimeMinutes: this.round(totalTimeMinutes, 1),
    };
  }

  /**
   * Get all consumable types with their cost breakdowns.
   */
  allConsumableCosts(): WeldCostBreakdown[] {
    return (Object.keys(this.config.consumables) as WeldConsumableType[]).map((type) =>
      this.costPerMetre(type),
    );
  }

  /**
   * Get consumable data for a given type.
   */
  consumableData(consumableType: WeldConsumableType): WeldConsumableData {
    return this.config.consumables[consumableType];
  }

  /**
   * Get the current welder hourly rate.
   */
  welderHourlyRate(): number {
    return this.config.welderHourlyRate;
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
