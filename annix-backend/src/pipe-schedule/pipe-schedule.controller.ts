import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PipeScheduleService } from './pipe-schedule.service';
import { CalculatePipeThicknessDto } from './dto/pipe-schedule.dto';

@Controller('pipe-schedules')
export class PipeScheduleController {
  constructor(private readonly pipeScheduleService: PipeScheduleService) {}

  @Get()
  async getSchedulesByNps(@Query('nps') nps: string) {
    return this.pipeScheduleService.getSchedulesByNps(nps);
  }

  @Get('by-nb')
  async getSchedulesByNbMm(@Query('nbMm') nbMm: string) {
    return this.pipeScheduleService.getSchedulesByNbMm(Number(nbMm));
  }

  @Get('nps-sizes')
  async getAvailableNpsSizes() {
    return this.pipeScheduleService.getAvailableNpsSizes();
  }

  @Get('materials')
  async getMaterials() {
    return this.pipeScheduleService.getMaterials();
  }

  @Get('allowable-stress')
  async getAllowableStress(
    @Query('materialCode') materialCode: string,
    @Query('temperatureCelsius') temperatureCelsius: string,
  ) {
    const stress = await this.pipeScheduleService.getAllowableStress(
      materialCode,
      Number(temperatureCelsius),
    );
    return { allowableStressKsi: stress, allowableStressMpa: stress ? stress * 6.895 : null };
  }

  @Post('calculate')
  async calculateThickness(@Body() dto: CalculatePipeThicknessDto) {
    return this.pipeScheduleService.calculatePipeThickness(dto);
  }

  @Get('recommend')
  async recommendSchedule(
    @Query('nps') nps: string,
    @Query('pressureBar') pressureBar: string,
    @Query('temperatureCelsius') temperatureCelsius: string,
    @Query('materialCode') materialCode: string,
    @Query('corrosionAllowanceMm') corrosionAllowanceMm?: string,
  ) {
    const result = await this.pipeScheduleService.calculatePipeThickness({
      nps,
      pressureBar: Number(pressureBar),
      temperatureCelsius: Number(temperatureCelsius),
      materialCode,
      corrosionAllowanceMm: corrosionAllowanceMm ? Number(corrosionAllowanceMm) : undefined,
    });

    return {
      minRequiredThicknessMm: result.minRequiredThicknessMm,
      recommendedSchedule: result.recommendedSchedule,
      recommendedWallMm: result.recommendedWallMm,
      allowableStressMpa: result.allowableStressMpa,
      warnings: result.warnings,
    };
  }
}
