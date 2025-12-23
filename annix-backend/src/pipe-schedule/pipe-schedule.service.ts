import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PipeSchedule } from './entities/pipe-schedule.entity';
import { MaterialAllowableStress } from './entities/material-allowable-stress.entity';
import { CalculatePipeThicknessDto, PipeThicknessResultDto } from './dto/pipe-schedule.dto';

// NPS to OD mapping (inches) - ASME B36.10
const NPS_OD_INCH: { [key: string]: number } = {
  '1/8': 0.405, '1/4': 0.540, '3/8': 0.675,
  '1/2': 0.840, '3/4': 1.050, '1': 1.315,
  '1-1/4': 1.660, '1-1/2': 1.900, '2': 2.375,
  '2-1/2': 2.875, '3': 3.500, '3-1/2': 4.000,
  '4': 4.500, '5': 5.563, '6': 6.625,
  '8': 8.625, '10': 10.750, '12': 12.750,
  '14': 14.000, '16': 16.000, '18': 18.000,
  '20': 20.000, '22': 22.000, '24': 24.000,
  '26': 26.000, '28': 28.000, '30': 30.000,
  '32': 32.000, '34': 34.000, '36': 36.000,
  '42': 42.000, '48': 48.000
};

// NPS to NB (mm) mapping
const NPS_TO_NB_MM: { [key: string]: number } = {
  '1/8': 6, '1/4': 8, '3/8': 10,
  '1/2': 15, '3/4': 20, '1': 25,
  '1-1/4': 32, '1-1/2': 40, '2': 50,
  '2-1/2': 65, '3': 80, '3-1/2': 90,
  '4': 100, '5': 125, '6': 150,
  '8': 200, '10': 250, '12': 300,
  '14': 350, '16': 400, '18': 450,
  '20': 500, '22': 550, '24': 600,
  '26': 650, '28': 700, '30': 750,
  '32': 800, '34': 850, '36': 900,
  '42': 1050, '48': 1200
};

// Reverse mapping: NB (mm) to NPS
const NB_MM_TO_NPS: { [key: number]: string } = Object.entries(NPS_TO_NB_MM).reduce(
  (acc, [nps, nb]) => ({ ...acc, [nb]: nps }), {}
);

@Injectable()
export class PipeScheduleService {
  constructor(
    @InjectRepository(PipeSchedule)
    private readonly scheduleRepository: Repository<PipeSchedule>,
    @InjectRepository(MaterialAllowableStress)
    private readonly stressRepository: Repository<MaterialAllowableStress>,
  ) {}

  // Convert bar to psi
  private barToPsi(bar: number): number {
    return bar * 14.5038;
  }

  // Convert Celsius to Fahrenheit
  private celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9/5) + 32;
  }

  // Get allowable stress at temperature with interpolation
  async getAllowableStress(materialCode: string, temperatureCelsius: number): Promise<number | null> {
    const stresses = await this.stressRepository.find({
      where: { materialCode },
      order: { temperatureCelsius: 'ASC' },
    });

    if (stresses.length === 0) return null;

    // Find surrounding temperature points
    let lower = stresses[0];
    let upper = stresses[stresses.length - 1];

    for (let i = 0; i < stresses.length; i++) {
      if (Number(stresses[i].temperatureCelsius) <= temperatureCelsius) {
        lower = stresses[i];
      }
      if (Number(stresses[i].temperatureCelsius) >= temperatureCelsius) {
        upper = stresses[i];
        break;
      }
    }

    // Exact match or extrapolation
    if (Number(lower.temperatureCelsius) === temperatureCelsius) {
      return Number(lower.allowableStressKsi);
    }

    // Linear interpolation
    const tempRange = Number(upper.temperatureCelsius) - Number(lower.temperatureCelsius);
    if (tempRange === 0) return Number(lower.allowableStressKsi);

    const stressRange = Number(upper.allowableStressKsi) - Number(lower.allowableStressKsi);
    const tempOffset = temperatureCelsius - Number(lower.temperatureCelsius);
    const interpolatedStress = Number(lower.allowableStressKsi) + (stressRange * tempOffset / tempRange);

    return Math.round(interpolatedStress * 100) / 100;
  }

  // Get schedules for a given NPS
  async getSchedulesByNps(nps: string): Promise<PipeSchedule[]> {
    return this.scheduleRepository.find({
      where: { nps },
      order: { wallThicknessInch: 'ASC' },
    });
  }

  // Get schedules by NB (mm)
  async getSchedulesByNbMm(nbMm: number): Promise<PipeSchedule[]> {
    return this.scheduleRepository.find({
      where: { nbMm },
      order: { wallThicknessInch: 'ASC' },
    });
  }

  // Find next suitable schedule that meets minimum thickness
  async getRecommendedSchedule(
    nps: string,
    minThicknessInch: number,
    marginInch: number = 0
  ): Promise<{ schedule: string; wallInch: number; wallMm: number; warning?: string } | null> {
    const schedules = await this.getSchedulesByNps(nps);
    if (schedules.length === 0) return null;

    const requiredThickness = minThicknessInch + marginInch;

    // Find the smallest schedule that meets the requirement
    for (const sch of schedules) {
      if (Number(sch.wallThicknessInch) >= requiredThickness) {
        return {
          schedule: sch.schedule,
          wallInch: Number(sch.wallThicknessInch),
          wallMm: Number(sch.wallThicknessMm),
        };
      }
    }

    // If none sufficient, return the thickest with warning
    const maxSchedule = schedules[schedules.length - 1];
    return {
      schedule: maxSchedule.schedule,
      wallInch: Number(maxSchedule.wallThicknessInch),
      wallMm: Number(maxSchedule.wallThicknessMm),
      warning: 'Required thickness exceeds maximum standard schedule. Consider special wall thickness or pipe upgrade.',
    };
  }

  // Main calculation: ASME B31.3 formula
  // t = P*D / (2*(S*E*W + P*Y))
  // t_m = t + corrosion allowance
  async calculatePipeThickness(dto: CalculatePipeThicknessDto): Promise<PipeThicknessResultDto> {
    const warnings: string[] = [];

    // Determine NPS from input
    let nps = dto.nps;
    if (!nps && dto.nbMm) {
      nps = NB_MM_TO_NPS[dto.nbMm];
      if (!nps) {
        throw new Error(`No NPS mapping for NB ${dto.nbMm}mm`);
      }
    }

    // Get OD
    const odInch = NPS_OD_INCH[nps];
    if (!odInch) {
      throw new Error(`No OD data for NPS ${nps}`);
    }

    // Get allowable stress
    const stressKsi = await this.getAllowableStress(dto.materialCode, dto.temperatureCelsius);
    if (!stressKsi) {
      throw new Error(`No stress data for material ${dto.materialCode} at ${dto.temperatureCelsius}°C`);
    }

    // Default parameters
    const E = dto.jointEfficiencyE ?? 1.0; // Seamless = 1.0
    const W = dto.weldStrengthReductionW ?? 1.0;
    const Y = dto.coefficientY ?? 0.4; // Ferritic steel below 900°F
    const corrosionInch = (dto.corrosionAllowanceMm ?? 0) / 25.4;

    // Convert pressure to psi
    const pressurePsi = this.barToPsi(dto.pressureBar);

    // Calculate design thickness (ASME B31.3)
    const t = (pressurePsi * odInch) / (2 * (stressKsi * 1000 * E * W + pressurePsi * Y));
    const tMinInch = t + corrosionInch;

    // Temperature warnings
    const tempF = this.celsiusToFahrenheit(dto.temperatureCelsius);
    if (tempF > 700) {
      warnings.push('Temperature exceeds 700°F (371°C). Creep considerations may apply.');
    }
    if (tempF > 900) {
      warnings.push('Temperature exceeds 900°F (482°C). Y coefficient may need adjustment for creep range.');
    }

    const result: PipeThicknessResultDto = {
      designThicknessInch: Math.round(t * 10000) / 10000,
      designThicknessMm: Math.round(t * 25.4 * 100) / 100,
      minRequiredThicknessInch: Math.round(tMinInch * 10000) / 10000,
      minRequiredThicknessMm: Math.round(tMinInch * 25.4 * 100) / 100,
      allowableStressKsi: stressKsi,
      allowableStressMpa: Math.round(stressKsi * 6.895 * 100) / 100,
      recommendedSchedule: '',
      recommendedWallInch: 0,
      recommendedWallMm: 0,
      warnings: [],
      notes: `Calculated per ASME B31.3. E=${E} (${E === 1 ? 'seamless' : 'welded'}), W=${W}, Y=${Y}. Corrosion allowance: ${dto.corrosionAllowanceMm ?? 0}mm.`
    };

    // Check selected schedule if provided
    if (dto.selectedSchedule) {
      const schedules = await this.getSchedulesByNps(nps);
      const selected = schedules.find(s => s.schedule === dto.selectedSchedule);

      if (selected) {
        result.selectedSchedule = dto.selectedSchedule;
        result.selectedScheduleWallInch = Number(selected.wallThicknessInch);
        result.selectedScheduleWallMm = Number(selected.wallThicknessMm);
        result.isSelectedScheduleAdequate = Number(selected.wallThicknessInch) >= tMinInch;

        if (!result.isSelectedScheduleAdequate) {
          warnings.push(`Selected schedule ${dto.selectedSchedule} (${result.selectedScheduleWallMm}mm) is INADEQUATE. Minimum required: ${result.minRequiredThicknessMm}mm.`);
        }
      } else {
        warnings.push(`Schedule ${dto.selectedSchedule} not found for NPS ${nps}.`);
      }
    }

    // Get recommended schedule
    const recommended = await this.getRecommendedSchedule(nps, tMinInch);
    if (recommended) {
      result.recommendedSchedule = recommended.schedule;
      result.recommendedWallInch = recommended.wallInch;
      result.recommendedWallMm = recommended.wallMm;
      if (recommended.warning) {
        warnings.push(recommended.warning);
      }
    } else {
      warnings.push(`No schedule data available for NPS ${nps}.`);
    }

    result.warnings = warnings;
    return result;
  }

  // Get all available materials
  async getMaterials(): Promise<string[]> {
    const materials = await this.stressRepository
      .createQueryBuilder('stress')
      .select('DISTINCT stress.material_code', 'materialCode')
      .addSelect('stress.material_name', 'materialName')
      .getRawMany();

    return materials;
  }

  // Get all NPS values with schedule data
  async getAvailableNpsSizes(): Promise<string[]> {
    const sizes = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .select('DISTINCT schedule.nps', 'nps')
      .orderBy('schedule.nps', 'ASC')
      .getRawMany();

    // Sort by actual numeric value
    return sizes.map(s => s.nps).sort((a, b) => {
      const aNum = a.includes('/') ? eval(a) : parseFloat(a);
      const bNum = b.includes('/') ? eval(b) : parseFloat(b);
      return aNum - bNum;
    });
  }
}
