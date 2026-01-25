import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BnwSetWeightService } from './bnw-set-weight.service';

@ApiTags('bnw-set-weight')
@Controller('bnw-set-weight')
export class BnwSetWeightController {
  constructor(private readonly bnwSetWeightService: BnwSetWeightService) {}

  @Get()
  @ApiOperation({ summary: 'Get all BNW set weights' })
  findAll() {
    return this.bnwSetWeightService.findAll();
  }

  @Get('lookup')
  @ApiOperation({
    summary: 'Get BNW set info for specific NB and pressure class',
  })
  @ApiQuery({ name: 'nominalBoreMm', description: 'Nominal bore in mm' })
  @ApiQuery({
    name: 'pressureClass',
    description: 'Pressure class (e.g., PN16, Class 150)',
  })
  bnwSetInfo(
    @Query('nominalBoreMm') nominalBoreMm: string,
    @Query('pressureClass') pressureClass: string,
  ) {
    const nbNum = parseInt(nominalBoreMm, 10);
    return this.bnwSetWeightService.bnwSetInfo(nbNum, pressureClass);
  }

  @Get('pressure-classes')
  @ApiOperation({ summary: 'Get available pressure classes' })
  availablePressureClasses() {
    return this.bnwSetWeightService.availablePressureClasses();
  }
}
