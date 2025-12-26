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
import { PvcService } from './pvc.service';
import { CalculatePvcPipeCostDto } from './dto/calculate-pipe-cost.dto';
import { CalculatePvcFittingCostDto } from './dto/calculate-fitting-cost.dto';
import { CalculatePvcTotalTransportDto } from './dto/calculate-total-transport.dto';

@ApiTags('PVC')
@Controller('pvc')
export class PvcController {
  constructor(private readonly pvcService: PvcService) {}

  // ========== Standards ==========
  @Get('standards')
  @ApiOperation({ summary: 'Get all PVC standards' })
  @ApiResponse({ status: 200, description: 'Returns all active PVC standards' })
  async getAllStandards() {
    return this.pvcService.getAllStandards();
  }

  @Get('standards/:code')
  @ApiOperation({ summary: 'Get PVC standard by code' })
  @ApiParam({ name: 'code', description: 'Standard code (e.g., EN_1452, SABS_966)' })
  async getStandardByCode(@Param('code') code: string) {
    return this.pvcService.getStandardByCode(code);
  }

  // ========== EN 1452 Static Specifications ==========
  @Get('en1452/specifications')
  @ApiOperation({ summary: 'Get all EN 1452 PVC-U pipe specifications (static data)' })
  @ApiResponse({ status: 200, description: 'Returns all EN 1452 specifications' })
  getAllEN1452Specifications() {
    return this.pvcService.getAllEN1452Specifications();
  }

  @Get('en1452/specifications/:dn/:pn')
  @ApiOperation({ summary: 'Get specific EN 1452 specification by DN and PN' })
  @ApiParam({ name: 'dn', description: 'Nominal diameter in mm' })
  @ApiParam({ name: 'pn', description: 'Pressure rating in bar' })
  getEN1452Specification(
    @Param('dn', ParseIntPipe) dn: number,
    @Param('pn', ParseFloatPipe) pn: number,
  ) {
    const spec = this.pvcService.getEN1452Specification(dn, pn);
    if (!spec) {
      return { error: `Specification for DN ${dn} and PN ${pn} is not available` };
    }
    return spec;
  }

  // ========== Pipe Specifications ==========
  @Get('pipe-specifications')
  @ApiOperation({ summary: 'Get all pipe specifications from database' })
  @ApiResponse({ status: 200, description: 'Returns all pipe specifications' })
  async getAllPipeSpecifications() {
    return this.pvcService.getAllPipeSpecifications();
  }

  @Get('pipe-specifications/dn/:nominalDiameter')
  @ApiOperation({ summary: 'Get pipe specifications by nominal diameter' })
  @ApiParam({ name: 'nominalDiameter', description: 'Nominal diameter in mm' })
  async getPipeSpecificationsByDN(@Param('nominalDiameter', ParseIntPipe) nominalDiameter: number) {
    return this.pvcService.getPipeSpecificationsByDN(nominalDiameter);
  }

  @Get('pipe-specifications/dn/:nominalDiameter/pn/:pressureRating')
  @ApiOperation({ summary: 'Get specific pipe specification by DN and PN' })
  @ApiParam({ name: 'nominalDiameter', description: 'Nominal diameter in mm' })
  @ApiParam({ name: 'pressureRating', description: 'Pressure rating in bar' })
  @ApiQuery({ name: 'pvcType', required: false, description: 'PVC type (default: PVC-U)' })
  async getPipeSpecification(
    @Param('nominalDiameter', ParseIntPipe) nominalDiameter: number,
    @Param('pressureRating', ParseFloatPipe) pressureRating: number,
    @Query('pvcType') pvcType?: string,
  ) {
    return this.pvcService.getPipeSpecification(nominalDiameter, pressureRating, pvcType);
  }

  // ========== Fitting Types ==========
  @Get('fitting-types')
  @ApiOperation({ summary: 'Get all fitting types' })
  @ApiResponse({ status: 200, description: 'Returns all fitting types' })
  async getAllFittingTypes() {
    return this.pvcService.getAllFittingTypes();
  }

  @Get('fitting-types/:code')
  @ApiOperation({ summary: 'Get fitting type by code' })
  @ApiParam({ name: 'code', description: 'Fitting type code (e.g., elbow_90, tee)' })
  async getFittingTypeByCode(@Param('code') code: string) {
    return this.pvcService.getFittingTypeByCode(code);
  }

  // ========== Fitting Weights ==========
  @Get('fitting-weights/:fittingTypeId')
  @ApiOperation({ summary: 'Get fitting weights for a fitting type' })
  @ApiParam({ name: 'fittingTypeId', description: 'Fitting type ID' })
  async getFittingWeights(@Param('fittingTypeId', ParseIntPipe) fittingTypeId: number) {
    return this.pvcService.getFittingWeights(fittingTypeId);
  }

  @Get('fitting-weights/:fittingTypeCode/dn/:nominalDiameter')
  @ApiOperation({ summary: 'Get fitting weight for specific type and DN' })
  @ApiParam({ name: 'fittingTypeCode', description: 'Fitting type code' })
  @ApiParam({ name: 'nominalDiameter', description: 'Nominal diameter in mm' })
  @ApiQuery({ name: 'pressureRating', required: false, description: 'Pressure rating in bar' })
  async getFittingWeight(
    @Param('fittingTypeCode') fittingTypeCode: string,
    @Param('nominalDiameter', ParseIntPipe) nominalDiameter: number,
    @Query('pressureRating') pressureRating?: number,
  ) {
    return this.pvcService.getFittingWeight(
      fittingTypeCode,
      nominalDiameter,
      pressureRating ? parseFloat(String(pressureRating)) : undefined,
    );
  }

  // ========== Calculations ==========
  @Post('calculate/pipe')
  @ApiOperation({ summary: 'Calculate pipe cost and weight' })
  @ApiResponse({ status: 200, description: 'Returns pipe cost calculation' })
  async calculatePipeCost(@Body() dto: CalculatePvcPipeCostDto) {
    return this.pvcService.calculatePipeCost(dto);
  }

  @Get('calculate/pipe')
  @ApiOperation({ summary: 'Calculate pipe cost and weight (GET version)' })
  @ApiQuery({ name: 'nominalDiameter', type: Number })
  @ApiQuery({ name: 'pressureRating', type: Number })
  @ApiQuery({ name: 'length', type: Number })
  @ApiQuery({ name: 'pricePerKg', type: Number })
  @ApiQuery({ name: 'pvcType', required: false, type: String })
  @ApiQuery({ name: 'cementJointPrice', type: Number, required: false })
  async calculatePipeCostGet(
    @Query('nominalDiameter', ParseIntPipe) nominalDiameter: number,
    @Query('pressureRating', ParseFloatPipe) pressureRating: number,
    @Query('length', ParseFloatPipe) length: number,
    @Query('pricePerKg', ParseFloatPipe) pricePerKg: number,
    @Query('pvcType') pvcType?: string,
    @Query('cementJointPrice') cementJointPrice?: number,
  ) {
    const dto: CalculatePvcPipeCostDto = {
      nominalDiameter,
      pressureRating,
      length,
      pricePerKg,
      pvcType,
      cementJointPrice: cementJointPrice ? parseFloat(String(cementJointPrice)) : undefined,
    };
    return this.pvcService.calculatePipeCost(dto);
  }

  @Post('calculate/fitting')
  @ApiOperation({ summary: 'Calculate fitting cost and weight' })
  @ApiResponse({ status: 200, description: 'Returns fitting cost calculation' })
  async calculateFittingCost(@Body() dto: CalculatePvcFittingCostDto) {
    return this.pvcService.calculateFittingCost(dto);
  }

  @Get('calculate/fitting')
  @ApiOperation({ summary: 'Calculate fitting cost and weight (GET version)' })
  @ApiQuery({ name: 'fittingTypeCode', type: String })
  @ApiQuery({ name: 'nominalDiameter', type: Number })
  @ApiQuery({ name: 'pricePerKg', type: Number })
  @ApiQuery({ name: 'pressureRating', type: Number, required: false })
  @ApiQuery({ name: 'cementJointPrice', type: Number, required: false })
  async calculateFittingCostGet(
    @Query('fittingTypeCode') fittingTypeCode: string,
    @Query('nominalDiameter', ParseIntPipe) nominalDiameter: number,
    @Query('pricePerKg', ParseFloatPipe) pricePerKg: number,
    @Query('pressureRating') pressureRating?: number,
    @Query('cementJointPrice') cementJointPrice?: number,
  ) {
    const dto: CalculatePvcFittingCostDto = {
      fittingTypeCode,
      nominalDiameter,
      pricePerKg,
      pressureRating: pressureRating ? parseFloat(String(pressureRating)) : undefined,
      cementJointPrice: cementJointPrice ? parseFloat(String(cementJointPrice)) : undefined,
    };
    return this.pvcService.calculateFittingCost(dto);
  }

  @Post('calculate/transport-weight')
  @ApiOperation({ summary: 'Calculate total transport weight for multiple items' })
  @ApiResponse({ status: 200, description: 'Returns total transport weight' })
  async calculateTotalTransportWeight(@Body() dto: CalculatePvcTotalTransportDto) {
    return this.pvcService.calculateTotalTransportWeight(dto);
  }

  // ========== Utilities ==========
  @Get('nominal-diameters')
  @ApiOperation({ summary: 'Get available nominal diameters' })
  @ApiResponse({ status: 200, description: 'Returns list of available nominal diameters' })
  async getAvailableNominalDiameters() {
    return this.pvcService.getAvailableNominalDiameters();
  }

  @Get('pressure-ratings/:nominalDiameter')
  @ApiOperation({ summary: 'Get available pressure ratings for a nominal diameter' })
  @ApiParam({ name: 'nominalDiameter', description: 'Nominal diameter in mm' })
  async getAvailablePressureRatings(
    @Param('nominalDiameter', ParseIntPipe) nominalDiameter: number,
  ) {
    return this.pvcService.getAvailablePressureRatings(nominalDiameter);
  }
}
