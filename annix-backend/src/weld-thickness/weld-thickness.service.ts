import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeldThicknessPipeRecommendation } from './entities/weld-thickness-pipe-recommendation.entity';
import { WeldThicknessFittingRecommendation } from './entities/weld-thickness-fitting-recommendation.entity';

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
  constructor(
    @InjectRepository(WeldThicknessPipeRecommendation)
    private pipeRecommendationRepository: Repository<WeldThicknessPipeRecommendation>,
    @InjectRepository(WeldThicknessFittingRecommendation)
    private fittingRecommendationRepository: Repository<WeldThicknessFittingRecommendation>,
  ) {}

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
   * Weld thickness is determined by the fitting wall thickness
   * The result is rounded to the nearest 1.5mm increment for practical welding
   */
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

    const fitting = await this.fittingRecommendationRepository.findOne({
      where: {
        nominal_bore_mm: dn,
        fitting_class: fittingClass,
        temperature_celsius: closestTemp,
      },
    });

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
      odMm: null, // OD not stored in new schema
      maxPressureBar: Number(fitting.max_pressure_bar),
      temperatureC,
      schedule,
    };
  }

  /**
   * Get all available weld thicknesses for a given DN
   */
  async getAllWeldThicknessesForDn(
    dn: number,
    temperatureC: number = 20,
  ): Promise<WeldThicknessResult[]> {
    const closestTemp = this.findClosestTemperature(temperatureC);

    const fittings = await this.fittingRecommendationRepository.find({
      where: {
        nominal_bore_mm: dn,
        temperature_celsius: closestTemp,
      },
    });

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

  /**
   * Get recommended weld thickness based on design pressure
   */
  async getRecommendedWeldThickness(
    dn: number,
    designPressureBar: number,
    temperatureC: number = 20,
  ): Promise<WeldThicknessResult | null> {
    const closestTemp = this.findClosestTemperature(temperatureC);
    const classOrder = ['STD', 'XH', 'XXH'];

    for (const fittingClass of classOrder) {
      const fitting = await this.fittingRecommendationRepository.findOne({
        where: {
          nominal_bore_mm: dn,
          fitting_class: fittingClass,
          temperature_celsius: closestTemp,
        },
      });

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

    const xxhFitting = await this.fittingRecommendationRepository.findOne({
      where: {
        nominal_bore_mm: dn,
        fitting_class: 'XXH',
        temperature_celsius: closestTemp,
      },
    });

    if (xxhFitting) {
      return {
        found: true,
        weldThicknessMm: this.roundToWeldIncrement(Number(xxhFitting.wall_thickness_mm)),
        fittingClass: 'XXH',
        dn,
        odMm: null,
        maxPressureBar: Number(xxhFitting.max_pressure_bar),
        temperatureC,
        schedule: 'XXH',
        notes: `WARNING: Design pressure ${designPressureBar} bar exceeds XXH rating of ${xxhFitting.max_pressure_bar} bar at ${temperatureC}°C. Special design required.`,
      };
    }

    return null;
  }

  /**
   * Get pipe wall thickness for carbon steel pipes
   */
  async getPipeWallThickness(
    dn: number,
    schedule: string,
    temperatureC: number = 20,
  ): Promise<PipeWallThicknessResult> {
    const closestTemp = this.findClosestTemperature(temperatureC);

    const pipe = await this.pipeRecommendationRepository.findOne({
      where: {
        nominal_bore_mm: dn,
        schedule,
        steel_type: 'CARBON_STEEL',
        temperature_celsius: closestTemp,
      },
    });

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

  /**
   * Get all fittings data
   */
  async getAllFittingsData(): Promise<WeldThicknessFittingRecommendation[]> {
    return this.fittingRecommendationRepository.find();
  }

  /**
   * Get all carbon steel pipes data
   */
  async getAllCarbonSteelPipes(): Promise<WeldThicknessPipeRecommendation[]> {
    return this.pipeRecommendationRepository.find({
      where: { steel_type: 'CARBON_STEEL' },
    });
  }

  /**
   * Get all stainless steel pipes data
   */
  async getAllStainlessSteelPipes(): Promise<WeldThicknessPipeRecommendation[]> {
    return this.pipeRecommendationRepository.find({
      where: { steel_type: 'STAINLESS_STEEL' },
    });
  }

  /**
   * Get available DNs for fittings
   */
  async getAvailableFittingDns(): Promise<number[]> {
    const result = await this.fittingRecommendationRepository
      .createQueryBuilder('fitting')
      .select('DISTINCT fitting.nominal_bore_mm', 'dn')
      .orderBy('fitting.nominal_bore_mm', 'ASC')
      .getRawMany();

    return result.map((r) => r.dn);
  }

  /**
   * Get temperature breakpoints
   */
  async getTemperatureBreakpoints(): Promise<{
    pipes: number[];
    fittings: number[];
  }> {
    const [pipeTemps, fittingTemps] = await Promise.all([
      this.pipeRecommendationRepository
        .createQueryBuilder('pipe')
        .select('DISTINCT pipe.temperature_celsius', 'temp')
        .orderBy('pipe.temperature_celsius', 'ASC')
        .getRawMany(),
      this.fittingRecommendationRepository
        .createQueryBuilder('fitting')
        .select('DISTINCT fitting.temperature_celsius', 'temp')
        .orderBy('fitting.temperature_celsius', 'ASC')
        .getRawMany(),
    ]);

    return {
      pipes: pipeTemps.map((t) => t.temp),
      fittings: fittingTemps.map((t) => t.temp),
    };
  }

  // Helper methods
  private normalizeFittingClass(schedule: string): string | null {
    if (!schedule) return 'STD';

    const upper = schedule.toUpperCase().replace(/\s+/g, ' ').trim();

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

    return 'STD';
  }

  /**
   * Find the closest temperature in the database
   * Available temperatures: 20, 100, 200, 343, 371, 399, 427
   */
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
