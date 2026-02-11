/**
 * Weld Rate Data - From Graham Dell Calculator
 *
 * Contains consumable rates, gas consumption, and labor costs for welding operations.
 * Used to calculate weld costs per running metre based on consumable type.
 *
 * Key formulas:
 * - Gas consumption per metre = (flow_rate / 1000) / weld_rate
 * - Gas cost per metre = gas_consumption × gas_price_per_m3
 * - Filler cost per metre = filler_price × filler_area
 * - Labor cost per metre = welder_hourly_rate / 60 / weld_rate
 * - Total cost per metre = gas_cost + filler_cost + labor_cost
 */

export type WeldConsumableType = "CO2" | "FLUXCORE" | "ARGON";

export interface WeldConsumableData {
  type: WeldConsumableType;
  displayName: string;
  fillerPricePerKg: number;
  fillerAreaM2: number;
  gasPricePerM3: number;
  gasFlowLitresPerMin: number;
  weldRateMetresPerMin: number;
}

export interface WeldRateConfig {
  welderHourlyRate: number;
  consumables: Record<WeldConsumableType, WeldConsumableData>;
}

/**
 * Default weld rate configuration from Graham Dell calculator.
 * Prices in ZAR (South African Rand).
 *
 * Filler area calculation: (wire_diameter^2 / 2) × steel_density
 * - CO2/Fluxcore: 6mm wire → 0.006^2/2 × 7850 = 0.1413 m²
 * - Argon: 5mm wire → 0.005^2/2 × 7850 = 0.098125 m²
 */
export const DEFAULT_WELD_RATE_CONFIG: WeldRateConfig = {
  welderHourlyRate: 140,
  consumables: {
    CO2: {
      type: "CO2",
      displayName: "CO2 (MIG)",
      fillerPricePerKg: 30,
      fillerAreaM2: 0.1413,
      gasPricePerM3: 63.27,
      gasFlowLitresPerMin: 10,
      weldRateMetresPerMin: 0.15,
    },
    FLUXCORE: {
      type: "FLUXCORE",
      displayName: "Flux Core",
      fillerPricePerKg: 45,
      fillerAreaM2: 0.1413,
      gasPricePerM3: 70.73,
      gasFlowLitresPerMin: 10,
      weldRateMetresPerMin: 0.15,
    },
    ARGON: {
      type: "ARGON",
      displayName: "Argon (TIG)",
      fillerPricePerKg: 60,
      fillerAreaM2: 0.098125,
      gasPricePerM3: 40.08,
      gasFlowLitresPerMin: 7,
      weldRateMetresPerMin: 0.05,
    },
  },
};

/**
 * Pre-calculated costs per running metre from Graham Dell calculator.
 * These are reference values for quick lookups.
 *
 * Breakdown:
 * - CO2: Gas R4.22 + Filler R4.24 + Labor R15.56 = R24.01/m
 * - Fluxcore: Gas R4.71 + Filler R6.36 + Labor R15.56 = R26.63/m
 * - Argon: Gas R5.61 + Filler R5.89 + Labor R46.67 = R58.16/m
 */
export const REFERENCE_COSTS_PER_METRE: Record<WeldConsumableType, number> = {
  CO2: 24.01,
  FLUXCORE: 26.63,
  ARGON: 58.16,
};

/**
 * Standard number of weld runs by pipe wall thickness.
 * Thicker pipes require more weld passes.
 */
export const WELD_RUNS_BY_THICKNESS: Array<{ maxThicknessMm: number; runs: number }> = [
  { maxThicknessMm: 6, runs: 1 },
  { maxThicknessMm: 10, runs: 2 },
  { maxThicknessMm: 16, runs: 3 },
  { maxThicknessMm: 25, runs: 4 },
  { maxThicknessMm: 40, runs: 5 },
  { maxThicknessMm: Infinity, runs: 6 },
];
