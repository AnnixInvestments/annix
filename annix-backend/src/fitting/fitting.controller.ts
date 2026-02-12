import { Controller, Get, Post, Body, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FittingService } from './fitting.service';
import { GetFittingDimensionsDto, FittingStandard, FittingType } from './dto/get-fitting-dimensions.dto';
import { CalculateFittingDto, FittingCalculationResultDto } from './dto/calculate-fitting.dto';

@ApiTags('fittings')
@Controller('fittings')
export class FittingController {
  constructor(private readonly fittingService: FittingService) {}

  @Post('calculate')
  @ApiOperation({
    summary: 'Calculate fitting weight and requirements',
    description: 'Calculate fitting weight, flange requirements, and welding requirements for SABS62 or SABS719 fittings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calculation completed successfully',
    type: FittingCalculationResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fitting dimensions or pipe specification not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or missing required fields',
  })
  @ApiBody({
    description: 'Fitting specifications for calculation',
    type: CalculateFittingDto,
  })
  async calculateFitting(@Body() dto: CalculateFittingDto): Promise<FittingCalculationResultDto> {
    return this.fittingService.calculateFitting(dto);
  }

  @Get('dimensions')
  @ApiOperation({ summary: 'Get fitting dimensions by standard, type, and size' })
  @ApiResponse({ status: 200, description: 'Returns fitting dimensions' })
  @ApiResponse({ status: 404, description: 'Fitting not found' })
  async getFittingDimensions(@Query() dto: GetFittingDimensionsDto) {
    return this.fittingService.getFittingDimensions(
      dto.standard,
      dto.fittingType,
      dto.nominalDiameterMm,
      dto.angleRange,
    );
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available fitting types for a standard' })
  @ApiResponse({ status: 200, description: 'Returns list of fitting types' })
  async getAvailableFittingTypes(@Query('standard') standard: FittingStandard) {
    return this.fittingService.getAvailableFittingTypes(standard);
  }

  @Get('sizes')
  @ApiOperation({ summary: 'Get available sizes for a fitting type' })
  @ApiResponse({ status: 200, description: 'Returns list of available sizes' })
  async getAvailableSizes(
    @Query('standard') standard: FittingStandard,
    @Query('fittingType') fittingType: FittingType,
  ) {
    return this.fittingService.getAvailableSizes(standard, fittingType);
  }

  @Get('angle-ranges')
  @ApiOperation({ summary: 'Get available angle ranges for laterals/Y-pieces' })
  @ApiResponse({ status: 200, description: 'Returns list of angle ranges' })
  async getAvailableAngleRanges(
    @Query('fittingType') fittingType: FittingType,
    @Query('nominalDiameterMm') nominalDiameterMm: number,
  ) {
    return this.fittingService.getAvailableAngleRanges(fittingType, nominalDiameterMm);
  }
}
