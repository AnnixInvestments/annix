import { Injectable } from "@nestjs/common";
import { NB_MM_TO_NPS } from "../lib/pipe-constants";
import { CalculatePipeThicknessDto, PipeThicknessResultDto } from "./dto/pipe-schedule.dto";
import { PipeSchedule } from "./entities/pipe-schedule.entity";
import { PipeScheduleRepository } from "./pipe-schedule.repository";

const NPS_OD_INCH: Record<string, number> = {
  "1/8": 0.405,
  "1/4": 0.54,
  "3/8": 0.675,
  "1/2": 0.84,
  "3/4": 1.05,
  "1": 1.315,
  "1-1/4": 1.66,
  "1-1/2": 1.9,
  "2": 2.375,
  "2-1/2": 2.875,
  "3": 3.5,
  "3-1/2": 4.0,
  "4": 4.5,
  "5": 5.563,
  "6": 6.625,
  "8": 8.625,
  "10": 10.75,
  "12": 12.75,
  "14": 14.0,
  "16": 16.0,
  "18": 18.0,
  "20": 20.0,
  "22": 22.0,
  "24": 24.0,
  "26": 26.0,
  "28": 28.0,
  "30": 30.0,
  "32": 32.0,
  "34": 34.0,
  "36": 36.0,
  "42": 42.0,
  "48": 48.0,
};

@Injectable()
export class PipeScheduleService {
  constructor(private readonly pipeScheduleRepository: PipeScheduleRepository) {}

  private barToPsi(bar: number): number {
    return bar * 14.5038;
  }

  private celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
  }

  async getAllowableStress(
    materialCode: string,
    temperatureCelsius: number,
  ): Promise<number | null> {
    const stresses = await this.pipeScheduleRepository.findStressesByMaterialOrdered(materialCode);

    if (stresses.length === 0) return null;

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

    if (Number(lower.temperatureCelsius) === temperatureCelsius) {
      return Number(lower.allowableStressKsi);
    }

    const tempRange = Number(upper.temperatureCelsius) - Number(lower.temperatureCelsius);
    if (tempRange === 0) return Number(lower.allowableStressKsi);

    const stressRange = Number(upper.allowableStressKsi) - Number(lower.allowableStressKsi);
    const tempOffset = temperatureCelsius - Number(lower.temperatureCelsius);
    const interpolatedStress =
      Number(lower.allowableStressKsi) + (stressRange * tempOffset) / tempRange;

    return Math.round(interpolatedStress * 100) / 100;
  }

  getSchedulesByNps(nps: string): Promise<PipeSchedule[]> {
    return this.pipeScheduleRepository.findSchedulesByNps(nps);
  }

  getSchedulesByNbMm(nbMm: number): Promise<PipeSchedule[]> {
    return this.pipeScheduleRepository.findSchedulesByNbMm(nbMm);
  }

  getAllSchedules(): Promise<PipeSchedule[]> {
    return this.pipeScheduleRepository.findAllSchedulesOrdered();
  }

  async getRecommendedSchedule(
    nps: string,
    minThicknessInch: number,
    marginInch: number = 0,
  ): Promise<{
    schedule: string;
    wallInch: number;
    wallMm: number;
    warning?: string;
  } | null> {
    const schedules = await this.getSchedulesByNps(nps);
    if (schedules.length === 0) return null;

    const requiredThickness = minThicknessInch + marginInch;

    for (const sch of schedules) {
      if (Number(sch.wallThicknessInch) >= requiredThickness) {
        return {
          schedule: sch.schedule,
          wallInch: Number(sch.wallThicknessInch),
          wallMm: Number(sch.wallThicknessMm),
        };
      }
    }

    const maxSchedule = schedules[schedules.length - 1];
    return {
      schedule: maxSchedule.schedule,
      wallInch: Number(maxSchedule.wallThicknessInch),
      wallMm: Number(maxSchedule.wallThicknessMm),
      warning:
        "Required thickness exceeds maximum standard schedule. Consider special wall thickness or pipe upgrade.",
    };
  }

  async calculatePipeThickness(dto: CalculatePipeThicknessDto): Promise<PipeThicknessResultDto> {
    const warnings: string[] = [];

    let nps = dto.nps;
    if (!nps && dto.nbMm) {
      nps = NB_MM_TO_NPS[dto.nbMm];
      if (!nps) {
        throw new Error(`No NPS mapping for NB ${dto.nbMm}mm`);
      }
    }

    const odInch = NPS_OD_INCH[nps];
    if (!odInch) {
      throw new Error(`No OD data for NPS ${nps}`);
    }

    const stressKsi = await this.getAllowableStress(dto.materialCode, dto.temperatureCelsius);
    if (!stressKsi) {
      throw new Error(
        `No stress data for material ${dto.materialCode} at ${dto.temperatureCelsius}°C`,
      );
    }

    const E = dto.jointEfficiencyE ?? 1.0;
    const W = dto.weldStrengthReductionW ?? 1.0;
    const Y = dto.coefficientY ?? 0.4;
    const corrosionInch = (dto.corrosionAllowanceMm ?? 0) / 25.4;

    const pressurePsi = this.barToPsi(dto.pressureBar);

    const t = (pressurePsi * odInch) / (2 * (stressKsi * 1000 * E * W + pressurePsi * Y));
    const tMinInch = t + corrosionInch;

    const tempF = this.celsiusToFahrenheit(dto.temperatureCelsius);
    if (tempF > 700) {
      warnings.push("Temperature exceeds 700°F (371°C). Creep considerations may apply.");
    }
    if (tempF > 900) {
      warnings.push(
        "Temperature exceeds 900°F (482°C). Y coefficient may need adjustment for creep range.",
      );
    }

    const result: PipeThicknessResultDto = {
      designThicknessInch: Math.round(t * 10000) / 10000,
      designThicknessMm: Math.round(t * 25.4 * 100) / 100,
      minRequiredThicknessInch: Math.round(tMinInch * 10000) / 10000,
      minRequiredThicknessMm: Math.round(tMinInch * 25.4 * 100) / 100,
      allowableStressKsi: stressKsi,
      allowableStressMpa: Math.round(stressKsi * 6.895 * 100) / 100,
      recommendedSchedule: "",
      recommendedWallInch: 0,
      recommendedWallMm: 0,
      warnings: [],
      notes: `Calculated per ASME B31.3. E=${E} (${E === 1 ? "seamless" : "welded"}), W=${W}, Y=${Y}. Corrosion allowance: ${dto.corrosionAllowanceMm ?? 0}mm.`,
    };

    if (dto.selectedSchedule) {
      const schedules = await this.getSchedulesByNps(nps);
      const selected = schedules.find((s) => s.schedule === dto.selectedSchedule);

      if (selected) {
        result.selectedSchedule = dto.selectedSchedule;
        result.selectedScheduleWallInch = Number(selected.wallThicknessInch);
        result.selectedScheduleWallMm = Number(selected.wallThicknessMm);
        result.isSelectedScheduleAdequate = Number(selected.wallThicknessInch) >= tMinInch;

        if (!result.isSelectedScheduleAdequate) {
          warnings.push(
            `Selected schedule ${dto.selectedSchedule} (${result.selectedScheduleWallMm}mm) is INADEQUATE. Minimum required: ${result.minRequiredThicknessMm}mm.`,
          );
        }
      } else {
        warnings.push(`Schedule ${dto.selectedSchedule} not found for NPS ${nps}.`);
      }
    }

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

  getMaterials(): Promise<{ materialCode: string; materialName: string }[]> {
    return this.pipeScheduleRepository.distinctMaterials();
  }

  async getAvailableNpsSizes(): Promise<string[]> {
    const sizes = await this.pipeScheduleRepository.distinctNpsSizes();

    return sizes
      .map((s) => s.nps)
      .sort((a, b) => {
        const aNum = a.includes("/") ? eval(a) : parseFloat(a);
        const bNum = b.includes("/") ? eval(b) : parseFloat(b);
        return aNum - bNum;
      });
  }
}
