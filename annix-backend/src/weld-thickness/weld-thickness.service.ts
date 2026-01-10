import { Injectable } from '@nestjs/common';
import {
  CARBON_STEEL_PIPES,
  CARBON_STEEL_FITTINGS,
  STAINLESS_STEEL_PIPES,
  SCHEDULE_TO_FITTING_CLASS,
  DN_TO_OD_MM,
  CARBON_STEEL_TEMP_BREAKPOINTS,
  FITTING_TEMP_BREAKPOINTS,
  CarbonSteelPipeData,
  StainlessSteelPipeData,
  FittingData,
} from './weld-thickness.data';

export interface WeldThicknessResult {
  found: boolean;
  weldThicknessMm: number | null;
  fittingClass: string | null;
  dn: number;
  odMm: number | null;
  maxPressureBar: number | null;
  temperatureC: number;
  schedule: string;
  notes?: string;
}

export interface PipeWallThicknessResult {
  found: boolean;
  wallThicknessMm: number | null;
  maxPressureBar: number | null;
  schedule: string;
  dn: number;
  temperatureC: number;
}

@Injectable()
export class WeldThicknessService {
  /**
   * Round a thickness to the nearest 1.5mm increment.
   * Welding is done in 1.5mm runs, so thicknesses should be multiples of 1.5mm.
   */
  roundToWeldIncrement(thicknessMm: number): number {
    if (thicknessMm <= 0) return 0;
    const increment = 1.5;
    return Math.round(thicknessMm / increment) * increment;
  }

  /**
   * Get the weld thickness for a given DN and schedule
   * Weld thickness is determined by the fitting wall thickness from CARBON_STEEL_FITTINGS
   * The result is rounded to the nearest 1.5mm increment for practical welding
   */
  getWeldThickness(
    dn: number,
    schedule: string,
    temperatureC: number = 20,
  ): WeldThicknessResult {
    // Normalize schedule to fitting class (STD, XH, XXH)
    const fittingClass = this.normalizeFittingClass(schedule);

    if (!fittingClass || !CARBON_STEEL_FITTINGS[fittingClass]) {
      return {
        found: false,
        weldThicknessMm: null,
        fittingClass: null,
        dn,
        odMm: DN_TO_OD_MM[dn] || null,
        maxPressureBar: null,
        temperatureC,
        schedule,
        notes: `Unknown schedule class: ${schedule}. Use STD, XH, or XXH.`,
      };
    }

    const fittings = CARBON_STEEL_FITTINGS[fittingClass];
    const fitting = fittings.find((f) => f.dn === dn);

    if (!fitting) {
      return {
        found: false,
        weldThicknessMm: null,
        fittingClass,
        dn,
        odMm: DN_TO_OD_MM[dn] || null,
        maxPressureBar: null,
        temperatureC,
        schedule,
        notes: `DN ${dn} not found in ${fittingClass} fittings table.`,
      };
    }

    // Get temperature index for fitting pressure lookup
    const tempIdx = this.getFittingTempIndex(temperatureC);
    const maxPressure = fitting.pressuresBar[tempIdx];

    return {
      found: true,
      weldThicknessMm: this.roundToWeldIncrement(fitting.wallMm),
      fittingClass,
      dn,
      odMm: fitting.odMm,
      maxPressureBar: maxPressure,
      temperatureC,
      schedule,
    };
  }

  /**
   * Get all available weld thicknesses for a given DN
   */
  getAllWeldThicknessesForDn(
    dn: number,
    temperatureC: number = 20,
  ): WeldThicknessResult[] {
    const results: WeldThicknessResult[] = [];
    const tempIdx = this.getFittingTempIndex(temperatureC);

    for (const [fittingClass, fittings] of Object.entries(
      CARBON_STEEL_FITTINGS,
    )) {
      const fitting = fittings.find((f) => f.dn === dn);
      if (fitting) {
        results.push({
          found: true,
          weldThicknessMm: this.roundToWeldIncrement(fitting.wallMm),
          fittingClass,
          dn,
          odMm: fitting.odMm,
          maxPressureBar: fitting.pressuresBar[tempIdx],
          temperatureC,
          schedule: fittingClass,
        });
      }
    }

    return results;
  }

  /**
   * Get recommended weld thickness based on design pressure
   */
  getRecommendedWeldThickness(
    dn: number,
    designPressureBar: number,
    temperatureC: number = 20,
  ): WeldThicknessResult | null {
    const tempIdx = this.getFittingTempIndex(temperatureC);

    // Check each fitting class in order of increasing thickness
    const classOrder = ['STD', 'XH', 'XXH'];

    for (const fittingClass of classOrder) {
      const fittings = CARBON_STEEL_FITTINGS[fittingClass];
      const fitting = fittings.find((f) => f.dn === dn);

      if (fitting && fitting.pressuresBar[tempIdx] >= designPressureBar) {
        return {
          found: true,
          weldThicknessMm: this.roundToWeldIncrement(fitting.wallMm),
          fittingClass,
          dn,
          odMm: fitting.odMm,
          maxPressureBar: fitting.pressuresBar[tempIdx],
          temperatureC,
          schedule: fittingClass,
          notes: `Minimum fitting class for ${designPressureBar} bar at ${temperatureC}°C`,
        };
      }
    }

    // If no standard class can handle the pressure, return the XXH with a warning
    const xxhFittings = CARBON_STEEL_FITTINGS['XXH'];
    const xxhFitting = xxhFittings.find((f) => f.dn === dn);

    if (xxhFitting) {
      return {
        found: true,
        weldThicknessMm: this.roundToWeldIncrement(xxhFitting.wallMm),
        fittingClass: 'XXH',
        dn,
        odMm: xxhFitting.odMm,
        maxPressureBar: xxhFitting.pressuresBar[tempIdx],
        temperatureC,
        schedule: 'XXH',
        notes: `WARNING: Design pressure ${designPressureBar} bar exceeds XXH rating of ${xxhFitting.pressuresBar[tempIdx]} bar at ${temperatureC}°C. Special design required.`,
      };
    }

    return null;
  }

  /**
   * Get pipe wall thickness for carbon steel pipes
   */
  getPipeWallThickness(
    dn: number,
    schedule: string,
    temperatureC: number = 20,
  ): PipeWallThicknessResult {
    const tempIdx = this.getCarbonSteelTempIndex(temperatureC);
    const pipe = CARBON_STEEL_PIPES.find(
      (p) => p.dn === dn && this.scheduleMatches(p.schedule, schedule),
    );

    if (!pipe) {
      return {
        found: false,
        wallThicknessMm: null,
        maxPressureBar: null,
        schedule,
        dn,
        temperatureC,
      };
    }

    return {
      found: true,
      wallThicknessMm: pipe.wallMm,
      maxPressureBar: pipe.pressuresBar[tempIdx],
      schedule: pipe.schedule,
      dn,
      temperatureC,
    };
  }

  /**
   * Get all fittings data
   */
  getAllFittingsData(): Record<string, FittingData[]> {
    return CARBON_STEEL_FITTINGS;
  }

  /**
   * Get all carbon steel pipes data
   */
  getAllCarbonSteelPipes(): CarbonSteelPipeData[] {
    return CARBON_STEEL_PIPES;
  }

  /**
   * Get all stainless steel pipes data
   */
  getAllStainlessSteelPipes(): StainlessSteelPipeData[] {
    return STAINLESS_STEEL_PIPES;
  }

  /**
   * Get available DNs for fittings
   */
  getAvailableFittingDns(): number[] {
    const dns = new Set<number>();
    for (const fittings of Object.values(CARBON_STEEL_FITTINGS)) {
      for (const fitting of fittings) {
        dns.add(fitting.dn);
      }
    }
    return Array.from(dns).sort((a, b) => a - b);
  }

  /**
   * Get temperature breakpoints
   */
  getTemperatureBreakpoints(): {
    carbonSteelPipes: number[];
    fittings: number[];
  } {
    return {
      carbonSteelPipes: [...CARBON_STEEL_TEMP_BREAKPOINTS],
      fittings: [...FITTING_TEMP_BREAKPOINTS],
    };
  }

  // Helper methods
  private normalizeFittingClass(schedule: string): string | null {
    if (!schedule) return 'STD';

    const upper = schedule.toUpperCase().replace(/\s+/g, ' ').trim();

    // Direct match
    if (SCHEDULE_TO_FITTING_CLASS[upper]) {
      return SCHEDULE_TO_FITTING_CLASS[upper];
    }

    // Try partial matching
    if (
      upper.includes('XXS') ||
      upper.includes('XXH') ||
      upper.includes('160')
    ) {
      return 'XXH';
    }
    if (upper.includes('XS') || upper.includes('XH') || upper.includes('80')) {
      return 'XH';
    }
    if (upper.includes('STD') || upper.includes('40')) {
      return 'STD';
    }

    // Default to STD
    return 'STD';
  }

  private getFittingTempIndex(tempC: number): number {
    // Temperature breakpoints: [20-343, 371, 399, 427]
    if (tempC <= 343) return 0;
    if (tempC <= 371) return 1;
    if (tempC <= 399) return 2;
    return 3;
  }

  private getCarbonSteelTempIndex(tempC: number): number {
    // Temperature breakpoints: [-29 to 38, 205, 260, 350, 370, 400, 430, 450]
    if (tempC <= 38) return 0;
    if (tempC <= 205) return 1;
    if (tempC <= 260) return 2;
    if (tempC <= 350) return 3;
    if (tempC <= 370) return 4;
    if (tempC <= 400) return 5;
    if (tempC <= 430) return 6;
    return 7;
  }

  private scheduleMatches(
    pipeSchedule: string,
    targetSchedule: string,
  ): boolean {
    const normalizedPipe = pipeSchedule.toUpperCase().replace(/\s+/g, '');
    const normalizedTarget = targetSchedule.toUpperCase().replace(/\s+/g, '');

    return (
      normalizedPipe === normalizedTarget ||
      normalizedPipe.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedPipe)
    );
  }
}
