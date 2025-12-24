import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipeSteelGrade, PipeAllowableStress } from './entities/steel-grade-stress.entity';
import { PipeScheduleWall, PipeNpsOd } from './entities/pipe-schedule-wall.entity';
import { CalculatePipeThicknessDto, PipeThicknessResultDto } from './dto/pipe-sizing.dto';

@Injectable()
export class PipeSizingService {
  constructor(
    @InjectRepository(PipeSteelGrade)
    private readonly gradeRepository: Repository<PipeSteelGrade>,
    @InjectRepository(PipeAllowableStress)
    private readonly stressRepository: Repository<PipeAllowableStress>,
    @InjectRepository(PipeScheduleWall)
    private readonly scheduleWallRepository: Repository<PipeScheduleWall>,
    @InjectRepository(PipeNpsOd)
    private readonly npsOdRepository: Repository<PipeNpsOd>,
  ) {}

  // Unit conversions
  private celsiusToFahrenheit(tempC: number): number {
    return tempC * 1.8 + 32;
  }

  private barToPsi(bar: number): number {
    return bar * 14.5038;
  }

  // Get all steel grades
  async getAllSteelGrades(): Promise<PipeSteelGrade[]> {
    return this.gradeRepository.find({
      order: { code: 'ASC' },
    });
  }

  // Get steel grade by code
  async getSteelGradeByCode(code: string): Promise<PipeSteelGrade | null> {
    return this.gradeRepository.findOne({ where: { code } });
  }

  // Get all NPS values with OD
  async getAllNpsOd(): Promise<PipeNpsOd[]> {
    return this.npsOdRepository.find({
      order: { odInch: 'ASC' },
    });
  }

  // Get schedules available for a given NPS
  async getSchedulesForNps(nps: string): Promise<PipeScheduleWall[]> {
    return this.scheduleWallRepository.find({
      where: { nps },
      order: { wallThicknessInch: 'ASC' },
    });
  }

  // Get allowable stress for material at temperature (with interpolation)
  async getAllowableStress(materialCode: string, tempF: number): Promise<number | null> {
    // First, check if this grade has an equivalent
    const grade = await this.gradeRepository.findOne({ where: { code: materialCode } });
    if (!grade) return null;

    const actualCode = grade.equivalentGrade || materialCode;
    const actualGrade = grade.equivalentGrade
      ? await this.gradeRepository.findOne({ where: { code: grade.equivalentGrade } })
      : grade;

    if (!actualGrade) return null;

    // Get stress data for this grade
    const stressData = await this.stressRepository.find({
      where: { gradeId: actualGrade.id },
      order: { temperatureF: 'ASC' },
    });

    if (stressData.length === 0) return null;

    // Exact match
    const exactMatch = stressData.find(s => s.temperatureF === tempF);
    if (exactMatch) return Number(exactMatch.allowableStressKsi);

    // Interpolate
    const temps = stressData.map(s => s.temperatureF);

    // Below minimum temp - use lowest
    if (tempF < temps[0]) {
      return Number(stressData[0].allowableStressKsi);
    }

    // Above maximum temp - use highest (with warning)
    if (tempF > temps[temps.length - 1]) {
      return Number(stressData[stressData.length - 1].allowableStressKsi);
    }

    // Find surrounding temps and interpolate
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

  // Get next suitable schedule
  async getNextSuitableSchedule(
    nps: string,
    requiredThicknessInch: number,
    marginInch: number = 0,
  ): Promise<{ schedule: string; wallInch: number; warning?: string } | null> {
    const schedules = await this.scheduleWallRepository.find({
      where: { nps },
      order: { wallThicknessInch: 'ASC' },
    });

    if (schedules.length === 0) return null;

    const reqT = requiredThicknessInch + marginInch;

    for (const sch of schedules) {
      if (Number(sch.wallThicknessInch) >= reqT) {
        return { schedule: sch.schedule, wallInch: Number(sch.wallThicknessInch) };
      }
    }

    // None sufficient - return thickest with warning
    const maxSch = schedules[schedules.length - 1];
    return {
      schedule: maxSch.schedule,
      wallInch: Number(maxSch.wallThicknessInch),
      warning: 'Required thickness exceeds maximum standard schedule',
    };
  }

  // Main calculation: Calculate pipe thickness per ASME B31.3
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

    // Get OD for NPS
    const npsOd = await this.npsOdRepository.findOne({ where: { nps } });
    if (!npsOd) {
      throw new Error(`Invalid NPS: ${nps}`);
    }

    // Convert units
    const pPsi = this.barToPsi(pressureBar);
    const tempF = this.celsiusToFahrenheit(temperatureC);
    const dInch = Number(npsOd.odInch);
    const corrosionInch = corrosionAllowanceMm / 25.4;

    // Get allowable stress
    const sKsi = await this.getAllowableStress(materialCode, tempF);
    if (sKsi === null) {
      throw new Error(`No stress data for material: ${materialCode}`);
    }

    // ASME B31.3 Para. 304.1.2 formula
    // t = P * D / (2 * (S * E * W + P * Y))
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

    // Check selected schedule
    if (selectedSchedule) {
      const scheduleData = await this.scheduleWallRepository.findOne({
        where: { nps, schedule: selectedSchedule },
      });

      if (scheduleData) {
        const wallInch = Number(scheduleData.wallThicknessInch);
        result.selectedSchedule = selectedSchedule;
        result.scheduleWallInch = Math.round(wallInch * 1000) / 1000;
        result.scheduleWallMm = Math.round(wallInch * 25.4 * 100) / 100;
        result.isAdequate = wallInch >= tMInch;
        result.adequacyMessage = result.isAdequate ? 'Adequate' : 'TOO THIN - Risk of failure';
      }
    }

    // Get recommended schedule
    const recommended = await this.getNextSuitableSchedule(nps, tMInch);
    if (recommended) {
      result.recommendedSchedule = recommended.schedule;
      result.recommendedWallInch = Math.round(recommended.wallInch * 1000) / 1000;
      result.recommendedWallMm = Math.round(recommended.wallInch * 25.4 * 100) / 100;
      if (recommended.warning) {
        result.scheduleWarning = recommended.warning;
      }
    }

    // Add creep warning for high temperatures
    if (tempF > 700) {
      result.notes += ' WARNING: Temperature > 700°F (370°C) - consider creep effects and use alloy steels.';
    }

    return result;
  }

  // Get all stress data for a material
  async getStressTableForMaterial(materialCode: string): Promise<PipeAllowableStress[]> {
    const grade = await this.gradeRepository.findOne({ where: { code: materialCode } });
    if (!grade) return [];

    const actualCode = grade.equivalentGrade || materialCode;
    const actualGrade = grade.equivalentGrade
      ? await this.gradeRepository.findOne({ where: { code: grade.equivalentGrade } })
      : grade;

    if (!actualGrade) return [];

    return this.stressRepository.find({
      where: { gradeId: actualGrade.id },
      order: { temperatureF: 'ASC' },
    });
  }
}
