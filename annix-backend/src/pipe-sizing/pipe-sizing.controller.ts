import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PipeSizingService } from './pipe-sizing.service';
import { CalculatePipeThicknessDto } from './dto/pipe-sizing.dto';

@Controller('pipe-sizing')
export class PipeSizingController {
  constructor(private readonly pipeSizingService: PipeSizingService) {}

  @Get('steel-grades')
  getAllSteelGrades() {
    return this.pipeSizingService.getAllSteelGrades();
  }

  @Get('steel-grades/by-code')
  getSteelGradeByCode(@Query('code') code: string) {
    return this.pipeSizingService.getSteelGradeByCode(code);
  }

  @Get('nps-od')
  getAllNpsOd() {
    return this.pipeSizingService.getAllNpsOd();
  }

  @Get('schedules')
  getSchedulesForNps(@Query('nps') nps: string) {
    return this.pipeSizingService.getSchedulesForNps(nps);
  }

  @Get('allowable-stress')
  async getAllowableStress(
    @Query('materialCode') materialCode: string,
    @Query('temperatureC') temperatureC: string,
  ) {
    const tempF = Number(temperatureC) * 1.8 + 32;
    const stress = await this.pipeSizingService.getAllowableStress(materialCode, tempF);
    return {
      materialCode,
      temperatureC: Number(temperatureC),
      temperatureF: tempF,
      allowableStressKsi: stress,
    };
  }

  @Get('stress-table')
  getStressTableForMaterial(@Query('materialCode') materialCode: string) {
    return this.pipeSizingService.getStressTableForMaterial(materialCode);
  }

  @Post('calculate')
  calculatePipeThickness(@Body() dto: CalculatePipeThicknessDto) {
    return this.pipeSizingService.calculatePipeThickness(dto);
  }

  @Get('calculate')
  calculatePipeThicknessGet(
    @Query('pressureBar') pressureBar: string,
    @Query('temperatureC') temperatureC: string,
    @Query('nps') nps: string,
    @Query('materialCode') materialCode: string,
    @Query('selectedSchedule') selectedSchedule?: string,
    @Query('corrosionAllowanceMm') corrosionAllowanceMm?: string,
  ) {
    return this.pipeSizingService.calculatePipeThickness({
      pressureBar: Number(pressureBar),
      temperatureC: Number(temperatureC),
      nps,
      materialCode,
      selectedSchedule,
      corrosionAllowanceMm: corrosionAllowanceMm ? Number(corrosionAllowanceMm) : 0,
    });
  }

  @Get('recommended-schedule')
  async getRecommendedSchedule(
    @Query('nps') nps: string,
    @Query('requiredThicknessInch') requiredThicknessInch: string,
  ) {
    return this.pipeSizingService.getNextSuitableSchedule(nps, Number(requiredThicknessInch));
  }
}
