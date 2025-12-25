import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ParseFloatPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { HdpeService } from './hdpe.service';
import { CalculatePipeCostDto } from './dto/calculate-pipe-cost.dto';
import { CalculateFittingCostDto } from './dto/calculate-fitting-cost.dto';
import { CalculateTotalTransportDto } from './dto/calculate-total-transport.dto';

@ApiTags('HDPE')
@Controller('hdpe')
export class HdpeController {
  constructor(private readonly hdpeService: HdpeService) {}

  // ========== Standards ==========
  @Get('standards')
  @ApiOperation({ summary: 'Get all HDPE standards' })
  @ApiResponse({ status: 200, description: 'Returns all active HDPE standards' })
  async getAllStandards() {
    return this.hdpeService.getAllStandards();
  }

  @Get('standards/:code')
  @ApiOperation({ summary: 'Get HDPE standard by code' })
  @ApiParam({ name: 'code', description: 'Standard code (e.g., ISO_4427)' })
  async getStandardByCode(@Param('code') code: string) {
    return this.hdpeService.getStandardByCode(code);
  }

  // ========== Pipe Specifications ==========
  @Get('pipe-specifications')
  @ApiOperation({ summary: 'Get all pipe specifications' })
  @ApiResponse({ status: 200, description: 'Returns all pipe specifications' })
  async getAllPipeSpecifications() {
    return this.hdpeService.getAllPipeSpecifications();
  }

  @Get('pipe-specifications/nb/:nominalBore')
  @ApiOperation({ summary: 'Get pipe specifications by nominal bore' })
  @ApiParam({ name: 'nominalBore', description: 'Nominal bore in mm' })
  async getPipeSpecificationsByNB(@Param('nominalBore', ParseIntPipe) nominalBore: number) {
    return this.hdpeService.getPipeSpecificationsByNB(nominalBore);
  }

  @Get('pipe-specifications/nb/:nominalBore/sdr/:sdr')
  @ApiOperation({ summary: 'Get specific pipe specification by NB and SDR' })
  @ApiParam({ name: 'nominalBore', description: 'Nominal bore in mm' })
  @ApiParam({ name: 'sdr', description: 'Standard Dimension Ratio' })
  async getPipeSpecification(
    @Param('nominalBore', ParseIntPipe) nominalBore: number,
    @Param('sdr', ParseFloatPipe) sdr: number,
  ) {
    return this.hdpeService.getPipeSpecification(nominalBore, sdr);
  }

  // ========== Fitting Types ==========
  @Get('fitting-types')
  @ApiOperation({ summary: 'Get all fitting types' })
  @ApiResponse({ status: 200, description: 'Returns all fitting types' })
  async getAllFittingTypes() {
    return this.hdpeService.getAllFittingTypes();
  }

  @Get('fitting-types/:code')
  @ApiOperation({ summary: 'Get fitting type by code' })
  @ApiParam({ name: 'code', description: 'Fitting type code' })
  async getFittingTypeByCode(@Param('code') code: string) {
    return this.hdpeService.getFittingTypeByCode(code);
  }

  // ========== Fitting Weights ==========
  @Get('fitting-weights/:fittingTypeId')
  @ApiOperation({ summary: 'Get fitting weights for a fitting type' })
  @ApiParam({ name: 'fittingTypeId', description: 'Fitting type ID' })
  async getFittingWeights(@Param('fittingTypeId', ParseIntPipe) fittingTypeId: number) {
    return this.hdpeService.getFittingWeights(fittingTypeId);
  }

  @Get('fitting-weights/:fittingTypeCode/nb/:nominalBore')
  @ApiOperation({ summary: 'Get fitting weight for specific type and NB' })
  @ApiParam({ name: 'fittingTypeCode', description: 'Fitting type code' })
  @ApiParam({ name: 'nominalBore', description: 'Nominal bore in mm' })
  async getFittingWeight(
    @Param('fittingTypeCode') fittingTypeCode: string,
    @Param('nominalBore', ParseIntPipe) nominalBore: number,
  ) {
    return this.hdpeService.getFittingWeight(fittingTypeCode, nominalBore);
  }

  // ========== Calculations ==========
  @Post('calculate/pipe')
  @ApiOperation({ summary: 'Calculate pipe cost and weight' })
  @ApiResponse({ status: 200, description: 'Returns pipe cost calculation' })
  async calculatePipeCost(@Body() dto: CalculatePipeCostDto) {
    return this.hdpeService.calculatePipeCost(dto);
  }

  @Get('calculate/pipe')
  @ApiOperation({ summary: 'Calculate pipe cost and weight (GET version)' })
  @ApiQuery({ name: 'nominalBore', type: Number })
  @ApiQuery({ name: 'sdr', type: Number })
  @ApiQuery({ name: 'length', type: Number })
  @ApiQuery({ name: 'pricePerKg', type: Number })
  @ApiQuery({ name: 'buttweldPrice', type: Number, required: false })
  async calculatePipeCostGet(
    @Query('nominalBore', ParseIntPipe) nominalBore: number,
    @Query('sdr', ParseFloatPipe) sdr: number,
    @Query('length', ParseFloatPipe) length: number,
    @Query('pricePerKg', ParseFloatPipe) pricePerKg: number,
    @Query('buttweldPrice') buttweldPrice?: number,
  ) {
    const dto: CalculatePipeCostDto = {
      nominalBore,
      sdr,
      length,
      pricePerKg,
      buttweldPrice: buttweldPrice ? parseFloat(String(buttweldPrice)) : undefined,
    };
    return this.hdpeService.calculatePipeCost(dto);
  }

  @Post('calculate/fitting')
  @ApiOperation({ summary: 'Calculate fitting cost and weight' })
  @ApiResponse({ status: 200, description: 'Returns fitting cost calculation' })
  async calculateFittingCost(@Body() dto: CalculateFittingCostDto) {
    return this.hdpeService.calculateFittingCost(dto);
  }

  @Get('calculate/fitting')
  @ApiOperation({ summary: 'Calculate fitting cost and weight (GET version)' })
  @ApiQuery({ name: 'fittingTypeCode', type: String })
  @ApiQuery({ name: 'nominalBore', type: Number })
  @ApiQuery({ name: 'pricePerKg', type: Number })
  @ApiQuery({ name: 'buttweldPrice', type: Number, required: false })
  @ApiQuery({ name: 'stubPrice', type: Number, required: false })
  async calculateFittingCostGet(
    @Query('fittingTypeCode') fittingTypeCode: string,
    @Query('nominalBore', ParseIntPipe) nominalBore: number,
    @Query('pricePerKg', ParseFloatPipe) pricePerKg: number,
    @Query('buttweldPrice') buttweldPrice?: number,
    @Query('stubPrice') stubPrice?: number,
  ) {
    const dto: CalculateFittingCostDto = {
      fittingTypeCode,
      nominalBore,
      pricePerKg,
      buttweldPrice: buttweldPrice ? parseFloat(String(buttweldPrice)) : undefined,
      stubPrice: stubPrice ? parseFloat(String(stubPrice)) : undefined,
    };
    return this.hdpeService.calculateFittingCost(dto);
  }

  @Post('calculate/transport-weight')
  @ApiOperation({ summary: 'Calculate total transport weight for multiple items' })
  @ApiResponse({ status: 200, description: 'Returns total transport weight' })
  async calculateTotalTransportWeight(@Body() dto: CalculateTotalTransportDto) {
    return this.hdpeService.calculateTotalTransportWeight(dto);
  }

  // ========== Utilities ==========
  @Get('nominal-bores')
  @ApiOperation({ summary: 'Get available nominal bores' })
  @ApiResponse({ status: 200, description: 'Returns list of available nominal bores' })
  async getAvailableNominalBores() {
    return this.hdpeService.getAvailableNominalBores();
  }

  @Get('sdrs/:nominalBore')
  @ApiOperation({ summary: 'Get available SDRs for a nominal bore' })
  @ApiParam({ name: 'nominalBore', description: 'Nominal bore in mm' })
  async getAvailableSDRs(@Param('nominalBore', ParseIntPipe) nominalBore: number) {
    return this.hdpeService.getAvailableSDRs(nominalBore);
  }
}
