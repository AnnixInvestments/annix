import { Injectable } from "@nestjs/common";
import { CalculatePipeThicknessDto, PipeThicknessResultDto } from "./dto/pipe-sizing.dto";
import { PipeScheduleWall } from "./entities/pipe-schedule-wall.entity";
import { PipeAllowableStress, PipeSteelGrade } from "./entities/steel-grade-stress.entity";
import { PipeSizingRepository } from "./pipe-sizing.repository";

@Injectable()
export class PipeSizingService {
  constructor(private readonly pipeSizingRepository: PipeSizingRepository) {}

  private celsiusToFahrenheit(tempC: number): number {
    return tempC * 1.8 + 32;
  }

  private barToPsi(bar: number): number {
    return bar * 14.5038;
  }

  getAllSteelGrades(): Promise<PipeSteelGrade[]> {
    return this.pipeSizingRepository.findAllGradesOrdered();
  }

  getSteelGradeByCode(code: string): Promise<PipeSteelGrade | null> {
    return this.pipeSizingRepository.findGradeByCode(code);
  }

  getAllNpsOd() {
    return this.pipeSizingRepository.findAllNpsOdOrdered();
  }

  getSchedulesForNps(nps: string): Promise<PipeScheduleWall[]> {
    return this.pipeSizingRepository.findScheduleWallsByNps(nps);
  }

  async getAllowableStress(materialCode: string, tempF: number): Promise<number | null> {
    const grade = await this.pipeSizingRepository.findGradeByCode(materialCode);
    if (!grade) return null;

    const actualCode = grade.equivalentGrade || materialCode;
    const actualGrade = grade.equivalentGrade
      ? await this.pipeSizingRepository.findGradeByCode(grade.equivalentGrade)
      : grade;

    if (!actualGrade) return null;

    const stressData = await this.pipeSizingRepository.findStressesByGradeId(actualGrade.id);

    if (stressData.length === 0) return null;

    const exactMatch = stressData.find((s) => s.temperatureF === tempF);
    if (exactMatch) return Number(exactMatch.allowableStressKsi);

    const temps = stressData.map((s) => s.temperatureF);

    if (tempF < temps[0]) {
      return Number(stressData[0].allowableStressKsi);
    }

    if (tempF > temps[temps.length - 1]) {
      return Number(stressData[stressData.length - 1].allowableStressKsi);
    }

    for (let i = 0; i < temps.length - 1; i++) {
      if (temps[i] <= tempF && tempF <= temps[i + 1]) {
        const sLow = Number(stressData[i].allowableStressKsi);
        const sHigh = Number(stressData[i + 1].allowableStressKsi);
        const fraction = (tempF - temps[i]) / (temps[i + 1] - temps[i]);
        return sLow + fraction * (sHigh - sLow);
      }
    }

    return null;
  }

  async getNextSuitableSchedule(
    nps: string,
    requiredThicknessInch: number,
    marginInch: number = 0,
  ): Promise<{ schedule: string; wallInch: number; warning?: string } | null> {
    const schedules = await this.pipeSizingRepository.findScheduleWallsByNps(nps);

    if (schedules.length === 0) return null;

    const reqT = requiredThicknessInch + marginInch;

    for (const sch of schedules) {
      if (Number(sch.wallThicknessInch) >= reqT) {
        return {
          schedule: sch.schedule,
          wallInch: Number(sch.wallThicknessInch),
        };
      }
    }

    const maxSch = schedules[schedules.length - 1];
    return {
      schedule: maxSch.schedule,
      wallInch: Number(maxSch.wallThicknessInch),
      warning: "Required thickness exceeds maximum standard schedule",
    };
  }

  async calculatePipeThickness(dto: CalculatePipeThicknessDto): Promise<PipeThicknessResultDto> {
    const {
      pressureBar,
      temperatureC,
      nps,
      materialCode,
      selectedSchedule,
      jointEfficiency = 1.0,
      weldStrengthReduction = 1.0,
      yCoefficient = 0.4,
      corrosionAllowanceMm = 0,
    } = dto;

    const npsOd = await this.pipeSizingRepository.findNpsOdByNps(nps);
    if (!npsOd) {
      throw new Error(`Invalid NPS: ${nps}`);
    }

    const pPsi = this.barToPsi(pressureBar);
    const tempF = this.celsiusToFahrenheit(temperatureC);
    const dInch = Number(npsOd.odInch);
    const corrosionInch = corrosionAllowanceMm / 25.4;

    const sKsi = await this.getAllowableStress(materialCode, tempF);
    if (sKsi === null) {
      throw new Error(`No stress data for material: ${materialCode}`);
    }

    const e = jointEfficiency;
    const w = weldStrengthReduction;
    const y = yCoefficient;

    const t = (pPsi * dInch) / (2 * (sKsi * 1000 * e * w + pPsi * y));
    const tMInch = t + corrosionInch;

    const result: PipeThicknessResultDto = {
      designThicknessInch: Math.round(t * 1000) / 1000,
      minThicknessInch: Math.round(tMInch * 1000) / 1000,
      minThicknessMm: Math.round(tMInch * 25.4 * 100) / 100,
      allowableStressKsi: Math.round(sKsi * 10) / 10,
      notes: `E=${e} (joint efficiency), W=${w} (weld strength), Y=${y}. Add 12.5% mill tolerance for final schedule selection.`,
    };

    if (selectedSchedule) {
      const scheduleData = await this.pipeSizingRepository.findScheduleWallByNpsAndDesignation(
        nps,
        selectedSchedule,
      );

      if (scheduleData) {
        const wallInch = Number(scheduleData.wallThicknessInch);
        result.selectedSchedule = selectedSchedule;
        result.scheduleWallInch = Math.round(wallInch * 1000) / 1000;
        result.scheduleWallMm = Math.round(wallInch * 25.4 * 100) / 100;
        result.isAdequate = wallInch >= tMInch;
        result.adequacyMessage = result.isAdequate ? "Adequate" : "TOO THIN - Risk of failure";
      }
    }

    const recommended = await this.getNextSuitableSchedule(nps, tMInch);
    if (recommended) {
      result.recommendedSchedule = recommended.schedule;
      result.recommendedWallInch = Math.round(recommended.wallInch * 1000) / 1000;
      result.recommendedWallMm = Math.round(recommended.wallInch * 25.4 * 100) / 100;
      if (recommended.warning) {
        result.scheduleWarning = recommended.warning;
      }
    }

    if (tempF > 700) {
      result.notes +=
        " WARNING: Temperature > 700°F (370°C) - consider creep effects and use alloy steels.";
    }

    return result;
  }

  async getStressTableForMaterial(materialCode: string): Promise<PipeAllowableStress[]> {
    const grade = await this.pipeSizingRepository.findGradeByCode(materialCode);
    if (!grade) return [];

    const actualGrade = grade.equivalentGrade
      ? await this.pipeSizingRepository.findGradeByCode(grade.equivalentGrade)
      : grade;

    if (!actualGrade) return [];

    return this.pipeSizingRepository.findStressesByGradeId(actualGrade.id);
  }
}
