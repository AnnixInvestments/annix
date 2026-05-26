import { Injectable } from "@nestjs/common";
import { WeldThicknessFittingRecommendation } from "./entities/weld-thickness-fitting-recommendation.entity";
import { WeldThicknessPipeRecommendation } from "./entities/weld-thickness-pipe-recommendation.entity";
import { WeldThicknessRepository } from "./weld-thickness.repository";

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
  constructor(private readonly weldThicknessRepository: WeldThicknessRepository) {}

  roundToWeldIncrement(thicknessMm: number): number {
    if (thicknessMm <= 0) return 0;
    const increment = 1.5;
    return Math.round(thicknessMm / increment) * increment;
  }

  async getWeldThickness(
    dn: number,
    schedule: string,
    temperatureC: number = 20,
  ): Promise<WeldThicknessResult> {
    const fittingClass = this.normalizeFittingClass(schedule);

    if (!fittingClass) {
      return {
        found: false,
        weldThicknessMm: null,
        fittingClass: null,
        dn,
        odMm: null,
        maxPressureBar: null,
        temperatureC,
        schedule,
        notes: `Unknown schedule class: ${schedule}. Use STD, XH, or XXH.`,
      };
    }

    const closestTemp = this.findClosestTemperature(temperatureC);

    const fitting = await this.weldThicknessRepository.findFitting(dn, fittingClass, closestTemp);

    if (!fitting) {
      return {
        found: false,
        weldThicknessMm: null,
        fittingClass,
        dn,
        odMm: null,
        maxPressureBar: null,
        temperatureC,
        schedule,
        notes: `DN ${dn} not found in ${fittingClass} fittings table.`,
      };
    }

    return {
      found: true,
      weldThicknessMm: this.roundToWeldIncrement(Number(fitting.wall_thickness_mm)),
      fittingClass,
      dn,
      odMm: null,
      maxPressureBar: Number(fitting.max_pressure_bar),
      temperatureC,
      schedule,
    };
  }

  async getAllWeldThicknessesForDn(
    dn: number,
    temperatureC: number = 20,
  ): Promise<WeldThicknessResult[]> {
    const closestTemp = this.findClosestTemperature(temperatureC);

    const fittings = await this.weldThicknessRepository.findFittingsByDnAndTemp(dn, closestTemp);

    return fittings.map((fitting) => ({
      found: true,
      weldThicknessMm: this.roundToWeldIncrement(Number(fitting.wall_thickness_mm)),
      fittingClass: fitting.fitting_class,
      dn,
      odMm: null,
      maxPressureBar: Number(fitting.max_pressure_bar),
      temperatureC,
      schedule: fitting.fitting_class,
    }));
  }

  async getRecommendedWeldThickness(
    dn: number,
    designPressureBar: number,
    temperatureC: number = 20,
  ): Promise<WeldThicknessResult | null> {
    const closestTemp = this.findClosestTemperature(temperatureC);
    const classOrder = ["STD", "XH", "XXH"];

    for (const fittingClass of classOrder) {
      const fitting = await this.weldThicknessRepository.findFitting(dn, fittingClass, closestTemp);

      if (fitting && Number(fitting.max_pressure_bar) >= designPressureBar) {
        return {
          found: true,
          weldThicknessMm: this.roundToWeldIncrement(Number(fitting.wall_thickness_mm)),
          fittingClass,
          dn,
          odMm: null,
          maxPressureBar: Number(fitting.max_pressure_bar),
          temperatureC,
          schedule: fittingClass,
          notes: `Minimum fitting class for ${designPressureBar} bar at ${temperatureC}°C`,
        };
      }
    }

    const xxhFitting = await this.weldThicknessRepository.findFitting(dn, "XXH", closestTemp);

    if (xxhFitting) {
      return {
        found: true,
        weldThicknessMm: this.roundToWeldIncrement(Number(xxhFitting.wall_thickness_mm)),
        fittingClass: "XXH",
        dn,
        odMm: null,
        maxPressureBar: Number(xxhFitting.max_pressure_bar),
        temperatureC,
        schedule: "XXH",
        notes: `WARNING: Design pressure ${designPressureBar} bar exceeds XXH rating of ${xxhFitting.max_pressure_bar} bar at ${temperatureC}°C. Special design required.`,
      };
    }

    return null;
  }

  async getPipeWallThickness(
    dn: number,
    schedule: string,
    temperatureC: number = 20,
  ): Promise<PipeWallThicknessResult> {
    const closestTemp = this.findClosestTemperature(temperatureC);

    const pipe = await this.weldThicknessRepository.findPipe(
      dn,
      schedule,
      "CARBON_STEEL",
      closestTemp,
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
      wallThicknessMm: Number(pipe.wall_thickness_mm),
      maxPressureBar: Number(pipe.max_pressure_bar),
      schedule: pipe.schedule,
      dn,
      temperatureC,
    };
  }

  async getAllFittingsData(): Promise<WeldThicknessFittingRecommendation[]> {
    return this.weldThicknessRepository.findAllFittings();
  }

  async getAllCarbonSteelPipes(): Promise<WeldThicknessPipeRecommendation[]> {
    return this.weldThicknessRepository.findAllPipesBySteelType("CARBON_STEEL");
  }

  async getAllStainlessSteelPipes(): Promise<WeldThicknessPipeRecommendation[]> {
    return this.weldThicknessRepository.findAllPipesBySteelType("STAINLESS_STEEL");
  }

  async getAvailableFittingDns(): Promise<number[]> {
    return this.weldThicknessRepository.findAvailableFittingDns();
  }

  async getTemperatureBreakpoints(): Promise<{
    pipes: number[];
    fittings: number[];
  }> {
    const [pipeTemps, fittingTemps] = await Promise.all([
      this.weldThicknessRepository.findPipeTemperatureBreakpoints(),
      this.weldThicknessRepository.findFittingTemperatureBreakpoints(),
    ]);

    return {
      pipes: pipeTemps,
      fittings: fittingTemps,
    };
  }

  private normalizeFittingClass(schedule: string): string | null {
    if (!schedule) return "STD";

    const upper = schedule.toUpperCase().replace(/\s+/g, " ").trim();

    if (upper.includes("XXS") || upper.includes("XXH") || upper.includes("160")) {
      return "XXH";
    }
    if (upper.includes("XS") || upper.includes("XH") || upper.includes("80")) {
      return "XH";
    }
    if (upper.includes("STD") || upper.includes("40")) {
      return "STD";
    }

    return "STD";
  }

  private findClosestTemperature(tempC: number): number {
    const availableTemps = [20, 100, 200, 343, 371, 399, 427];

    if (tempC <= 20) return 20;
    if (tempC >= 427) return 427;

    let closest = availableTemps[0];
    let minDiff = Math.abs(tempC - closest);

    for (const temp of availableTemps) {
      const diff = Math.abs(tempC - temp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = temp;
      }
    }

    return closest;
  }
}
