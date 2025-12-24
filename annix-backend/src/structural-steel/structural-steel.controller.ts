import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StructuralSteelService } from './structural-steel.service';
import { StructuralSteelType } from './entities/structural-steel-type.entity';
import { StructuralSteelSection } from './entities/structural-steel-section.entity';
import { StructuralSteelGrade } from './entities/structural-steel-grade.entity';
import { FabricationOperation } from './entities/fabrication-operation.entity';
import { FabricationComplexity } from './entities/fabrication-complexity.entity';
import { ShopLaborRate } from './entities/shop-labor-rate.entity';
import {
  CalculateSteelWeightDto,
  CalculatePlateDto,
  CalculateFlatBarDto,
  CalculateRoundBarDto,
  CalculateSquareBarDto,
  SteelCalculationResultDto,
  CalculateFabricationCostDto,
  FabricationCostResultDto,
  UpdateLaborRateDto,
} from './dto/structural-steel.dto';

@ApiTags('Structural Steel')
@Controller('structural-steel')
export class StructuralSteelController {
  constructor(private readonly structuralSteelService: StructuralSteelService) {}

  // ==================== Type Endpoints ====================

  @Get('types')
  @ApiOperation({ summary: 'Get all structural steel types' })
  @ApiResponse({ status: 200, description: 'List of steel types', type: [StructuralSteelType] })
  getAllTypes(): Promise<StructuralSteelType[]> {
    return this.structuralSteelService.getAllTypes();
  }

  @Get('types/:code')
  @ApiOperation({ summary: 'Get steel type by code' })
  @ApiParam({ name: 'code', description: 'Type code (e.g., angle, channel, beam)' })
  @ApiResponse({ status: 200, description: 'Steel type details', type: StructuralSteelType })
  getTypeByCode(@Param('code') code: string): Promise<StructuralSteelType | null> {
    return this.structuralSteelService.getTypeByCode(code);
  }

  @Get('types/:id/sections')
  @ApiOperation({ summary: 'Get steel type with all its sections' })
  @ApiParam({ name: 'id', description: 'Type ID' })
  @ApiResponse({ status: 200, description: 'Steel type with sections', type: StructuralSteelType })
  getTypeWithSections(@Param('id') id: string): Promise<StructuralSteelType | null> {
    return this.structuralSteelService.getTypeWithSections(Number(id));
  }

  // ==================== Section Endpoints ====================

  @Get('sections')
  @ApiOperation({ summary: 'Get all structural steel sections' })
  @ApiResponse({ status: 200, description: 'List of steel sections', type: [StructuralSteelSection] })
  getAllSections(): Promise<StructuralSteelSection[]> {
    return this.structuralSteelService.getAllSections();
  }

  @Get('sections/by-type/:typeCode')
  @ApiOperation({ summary: 'Get sections by steel type code' })
  @ApiParam({ name: 'typeCode', description: 'Type code (e.g., angle, channel, beam)' })
  @ApiResponse({ status: 200, description: 'List of sections for the type', type: [StructuralSteelSection] })
  getSectionsByType(@Param('typeCode') typeCode: string): Promise<StructuralSteelSection[]> {
    return this.structuralSteelService.getSectionsByType(typeCode);
  }

  @Get('sections/search')
  @ApiOperation({ summary: 'Search sections by designation or type name' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Matching sections', type: [StructuralSteelSection] })
  searchSections(@Query('q') query: string): Promise<StructuralSteelSection[]> {
    return this.structuralSteelService.searchSections(query);
  }

  @Get('sections/:id')
  @ApiOperation({ summary: 'Get section by ID' })
  @ApiParam({ name: 'id', description: 'Section ID' })
  @ApiResponse({ status: 200, description: 'Section details', type: StructuralSteelSection })
  getSectionById(@Param('id') id: string): Promise<StructuralSteelSection | null> {
    return this.structuralSteelService.getSectionById(Number(id));
  }

  // ==================== Grade Endpoints ====================

  @Get('grades')
  @ApiOperation({ summary: 'Get all structural steel grades' })
  @ApiResponse({ status: 200, description: 'List of steel grades', type: [StructuralSteelGrade] })
  getAllGrades(): Promise<StructuralSteelGrade[]> {
    return this.structuralSteelService.getAllGrades();
  }

  @Get('grades/by-type/:typeCode')
  @ApiOperation({ summary: 'Get grades compatible with a steel type' })
  @ApiParam({ name: 'typeCode', description: 'Type code (e.g., angle, channel, beam)' })
  @ApiResponse({ status: 200, description: 'Compatible grades', type: [StructuralSteelGrade] })
  getGradesForType(@Param('typeCode') typeCode: string): Promise<StructuralSteelGrade[]> {
    return this.structuralSteelService.getGradesForType(typeCode);
  }

  @Get('grades/:code')
  @ApiOperation({ summary: 'Get grade by code' })
  @ApiParam({ name: 'code', description: 'Grade code (e.g., A36, A572-50)' })
  @ApiResponse({ status: 200, description: 'Grade details', type: StructuralSteelGrade })
  getGradeByCode(@Param('code') code: string): Promise<StructuralSteelGrade | null> {
    return this.structuralSteelService.getGradeByCode(code);
  }

  // ==================== Calculation Endpoints ====================

  @Post('calculate/section')
  @ApiOperation({ summary: 'Calculate weight and surface area for a standard section' })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateForSection(@Body() dto: CalculateSteelWeightDto): Promise<SteelCalculationResultDto> {
    return this.structuralSteelService.calculateForSection(dto);
  }

  @Get('calculate/section')
  @ApiOperation({ summary: 'Calculate weight and surface area for a standard section (GET)' })
  @ApiQuery({ name: 'sectionId', description: 'Section ID' })
  @ApiQuery({ name: 'lengthM', description: 'Length in meters' })
  @ApiQuery({ name: 'quantity', description: 'Quantity' })
  @ApiQuery({ name: 'gradeCode', description: 'Grade code (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateForSectionGet(
    @Query('sectionId') sectionId: string,
    @Query('lengthM') lengthM: string,
    @Query('quantity') quantity: string,
    @Query('gradeCode') gradeCode?: string,
  ): Promise<SteelCalculationResultDto> {
    return this.structuralSteelService.calculateForSection({
      sectionId: Number(sectionId),
      lengthM: Number(lengthM),
      quantity: Number(quantity),
      gradeCode,
    });
  }

  @Post('calculate/plate')
  @ApiOperation({ summary: 'Calculate weight and surface area for a steel plate' })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculatePlate(@Body() dto: CalculatePlateDto): SteelCalculationResultDto {
    return this.structuralSteelService.calculatePlate(dto);
  }

  @Get('calculate/plate')
  @ApiOperation({ summary: 'Calculate weight and surface area for a steel plate (GET)' })
  @ApiQuery({ name: 'thicknessMm', description: 'Thickness in mm' })
  @ApiQuery({ name: 'widthMm', description: 'Width in mm' })
  @ApiQuery({ name: 'lengthMm', description: 'Length in mm' })
  @ApiQuery({ name: 'quantity', description: 'Quantity' })
  @ApiQuery({ name: 'gradeCode', description: 'Grade code (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculatePlateGet(
    @Query('thicknessMm') thicknessMm: string,
    @Query('widthMm') widthMm: string,
    @Query('lengthMm') lengthMm: string,
    @Query('quantity') quantity: string,
    @Query('gradeCode') gradeCode?: string,
  ): SteelCalculationResultDto {
    return this.structuralSteelService.calculatePlate({
      thicknessMm: Number(thicknessMm),
      widthMm: Number(widthMm),
      lengthMm: Number(lengthMm),
      quantity: Number(quantity),
      gradeCode,
    });
  }

  @Post('calculate/flat-bar')
  @ApiOperation({ summary: 'Calculate weight and surface area for a flat bar' })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateFlatBar(@Body() dto: CalculateFlatBarDto): SteelCalculationResultDto {
    return this.structuralSteelService.calculateFlatBar(dto);
  }

  @Get('calculate/flat-bar')
  @ApiOperation({ summary: 'Calculate weight and surface area for a flat bar (GET)' })
  @ApiQuery({ name: 'widthMm', description: 'Width in mm' })
  @ApiQuery({ name: 'thicknessMm', description: 'Thickness in mm' })
  @ApiQuery({ name: 'lengthM', description: 'Length in meters' })
  @ApiQuery({ name: 'quantity', description: 'Quantity' })
  @ApiQuery({ name: 'gradeCode', description: 'Grade code (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateFlatBarGet(
    @Query('widthMm') widthMm: string,
    @Query('thicknessMm') thicknessMm: string,
    @Query('lengthM') lengthM: string,
    @Query('quantity') quantity: string,
    @Query('gradeCode') gradeCode?: string,
  ): SteelCalculationResultDto {
    return this.structuralSteelService.calculateFlatBar({
      widthMm: Number(widthMm),
      thicknessMm: Number(thicknessMm),
      lengthM: Number(lengthM),
      quantity: Number(quantity),
      gradeCode,
    });
  }

  @Post('calculate/round-bar')
  @ApiOperation({ summary: 'Calculate weight and surface area for a round bar' })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateRoundBar(@Body() dto: CalculateRoundBarDto): SteelCalculationResultDto {
    return this.structuralSteelService.calculateRoundBar(dto);
  }

  @Get('calculate/round-bar')
  @ApiOperation({ summary: 'Calculate weight and surface area for a round bar (GET)' })
  @ApiQuery({ name: 'diameterMm', description: 'Diameter in mm' })
  @ApiQuery({ name: 'lengthM', description: 'Length in meters' })
  @ApiQuery({ name: 'quantity', description: 'Quantity' })
  @ApiQuery({ name: 'gradeCode', description: 'Grade code (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateRoundBarGet(
    @Query('diameterMm') diameterMm: string,
    @Query('lengthM') lengthM: string,
    @Query('quantity') quantity: string,
    @Query('gradeCode') gradeCode?: string,
  ): SteelCalculationResultDto {
    return this.structuralSteelService.calculateRoundBar({
      diameterMm: Number(diameterMm),
      lengthM: Number(lengthM),
      quantity: Number(quantity),
      gradeCode,
    });
  }

  @Post('calculate/square-bar')
  @ApiOperation({ summary: 'Calculate weight and surface area for a square bar' })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateSquareBar(@Body() dto: CalculateSquareBarDto): SteelCalculationResultDto {
    return this.structuralSteelService.calculateSquareBar(dto);
  }

  @Get('calculate/square-bar')
  @ApiOperation({ summary: 'Calculate weight and surface area for a square bar (GET)' })
  @ApiQuery({ name: 'sideMm', description: 'Side dimension in mm' })
  @ApiQuery({ name: 'lengthM', description: 'Length in meters' })
  @ApiQuery({ name: 'quantity', description: 'Quantity' })
  @ApiQuery({ name: 'gradeCode', description: 'Grade code (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Calculation result', type: SteelCalculationResultDto })
  calculateSquareBarGet(
    @Query('sideMm') sideMm: string,
    @Query('lengthM') lengthM: string,
    @Query('quantity') quantity: string,
    @Query('gradeCode') gradeCode?: string,
  ): SteelCalculationResultDto {
    return this.structuralSteelService.calculateSquareBar({
      sideMm: Number(sideMm),
      lengthM: Number(lengthM),
      quantity: Number(quantity),
      gradeCode,
    });
  }

  // ==================== Surface Protection Integration ====================

  @Get('surface-area')
  @ApiOperation({ summary: 'Get surface area for coating calculation' })
  @ApiQuery({ name: 'sectionId', description: 'Section ID' })
  @ApiQuery({ name: 'lengthM', description: 'Length in meters' })
  @ApiQuery({ name: 'quantity', description: 'Quantity' })
  @ApiResponse({ status: 200, description: 'Surface area in m²' })
  getSurfaceAreaForCoating(
    @Query('sectionId') sectionId: string,
    @Query('lengthM') lengthM: string,
    @Query('quantity') quantity: string,
  ): Promise<number> {
    return this.structuralSteelService.getSurfaceAreaForCoating(
      Number(sectionId),
      Number(lengthM),
      Number(quantity),
    );
  }

  // ==================== Fabrication Operation Endpoints ====================

  @Get('fabrication/operations')
  @ApiOperation({ summary: 'Get all fabrication operations' })
  @ApiResponse({ status: 200, description: 'List of fabrication operations', type: [FabricationOperation] })
  getAllOperations(): Promise<FabricationOperation[]> {
    return this.structuralSteelService.getAllOperations();
  }

  @Get('fabrication/operations/:code')
  @ApiOperation({ summary: 'Get fabrication operation by code' })
  @ApiParam({ name: 'code', description: 'Operation code (e.g., drilling, fillet_weld)' })
  @ApiResponse({ status: 200, description: 'Operation details', type: FabricationOperation })
  getOperationByCode(@Param('code') code: string): Promise<FabricationOperation | null> {
    return this.structuralSteelService.getOperationByCode(code);
  }

  // ==================== Fabrication Complexity Endpoints ====================

  @Get('fabrication/complexity-levels')
  @ApiOperation({ summary: 'Get all fabrication complexity levels' })
  @ApiResponse({ status: 200, description: 'List of complexity levels', type: [FabricationComplexity] })
  getAllComplexityLevels(): Promise<FabricationComplexity[]> {
    return this.structuralSteelService.getAllComplexityLevels();
  }

  @Get('fabrication/complexity-levels/:level')
  @ApiOperation({ summary: 'Get complexity level by name' })
  @ApiParam({ name: 'level', description: 'Complexity level (simple, medium, complex)' })
  @ApiResponse({ status: 200, description: 'Complexity level details', type: FabricationComplexity })
  getComplexityByLevel(@Param('level') level: string): Promise<FabricationComplexity | null> {
    return this.structuralSteelService.getComplexityByLevel(level);
  }

  // ==================== Labor Rate Endpoints ====================

  @Get('fabrication/labor-rates')
  @ApiOperation({ summary: 'Get all shop labor rates' })
  @ApiResponse({ status: 200, description: 'List of labor rates', type: [ShopLaborRate] })
  getAllLaborRates(): Promise<ShopLaborRate[]> {
    return this.structuralSteelService.getAllLaborRates();
  }

  @Get('fabrication/labor-rates/:code')
  @ApiOperation({ summary: 'Get labor rate by code' })
  @ApiParam({ name: 'code', description: 'Rate code (e.g., carbon_steel, stainless_steel)' })
  @ApiResponse({ status: 200, description: 'Labor rate details', type: ShopLaborRate })
  getLaborRateByCode(@Param('code') code: string): Promise<ShopLaborRate | null> {
    return this.structuralSteelService.getLaborRateByCode(code);
  }

  @Put('fabrication/labor-rates/:code')
  @ApiOperation({ summary: 'Update labor rate' })
  @ApiParam({ name: 'code', description: 'Rate code to update' })
  @ApiResponse({ status: 200, description: 'Updated labor rate', type: ShopLaborRate })
  updateLaborRate(
    @Param('code') code: string,
    @Body() dto: UpdateLaborRateDto,
  ): Promise<ShopLaborRate> {
    return this.structuralSteelService.updateLaborRate(code, dto);
  }

  // ==================== Fabrication Cost Calculation Endpoints ====================

  @Post('fabrication/calculate')
  @ApiOperation({ summary: 'Calculate full fabrication cost with operations breakdown' })
  @ApiResponse({ status: 200, description: 'Fabrication cost result', type: FabricationCostResultDto })
  calculateFabricationCost(@Body() dto: CalculateFabricationCostDto): Promise<FabricationCostResultDto> {
    return this.structuralSteelService.calculateFabricationCost(dto);
  }

  @Get('fabrication/quick-estimate')
  @ApiOperation({ summary: 'Quick fabrication cost estimate (complexity-based only)' })
  @ApiQuery({ name: 'weightKg', description: 'Total weight in kg' })
  @ApiQuery({ name: 'complexity', description: 'Complexity level (simple, medium, complex)' })
  @ApiQuery({ name: 'isStainless', description: 'Is stainless steel', required: false })
  @ApiResponse({ status: 200, description: 'Quick estimate result' })
  quickFabricationEstimate(
    @Query('weightKg') weightKg: string,
    @Query('complexity') complexity: string,
    @Query('isStainless') isStainless?: string,
  ): Promise<{ totalHours: number; estimatedCost: number; currency: string }> {
    return this.structuralSteelService.quickFabricationEstimate(
      Number(weightKg),
      complexity,
      isStainless === 'true',
    );
  }
}
