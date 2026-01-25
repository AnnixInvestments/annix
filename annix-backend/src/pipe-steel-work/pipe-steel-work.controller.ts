import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PipeSteelWorkService } from './pipe-steel-work.service';
import {
  CalculateSupportSpacingDto,
  CalculateReinforcementPadDto,
  SupportSpacingResponseDto,
  ReinforcementPadResponseDto,
  BracketTypeResponseDto,
  PipeSteelWorkCalculationDto,
  PipeSteelWorkCalculationResponseDto,
  CalculateThermalExpansionDto,
  ThermalExpansionResponseDto,
  ValidateBracketCompatibilityDto,
  BracketCompatibilityResponseDto,
  BatchCalculationDto,
  BatchCalculationResponseDto,
  CalculateSupportSpacingMultiStandardDto,
  MultiStandardSpacingResponseDto,
  CalculateReinforcementPadWithDeratingDto,
  ReinforcementPadWithDeratingResponseDto,
  CalculateVibrationAnalysisDto,
  VibrationAnalysisResponseDto,
  CalculateStressAnalysisDto,
  StressAnalysisResponseDto,
  MaterialCompatibilityCheckDto,
  MaterialCompatibilityResponseDto,
  ExportReportDto,
  ExportReportResponseDto,
  StandardPlateSizeDto,
  GasketMaterialDto,
  GasketCompatibilityCheckDto,
  GasketCompatibilityResponseDto,
  HeatTreatmentDto,
  HeatTreatmentRequirementDto,
  HeatTreatmentRequirementResponseDto,
} from './dto/pipe-steel-work.dto';

@ApiTags('Pipe Steel Work')
@Controller('pipe-steel-work')
export class PipeSteelWorkController {
  constructor(private readonly pipeSteelWorkService: PipeSteelWorkService) {}

  @Post('support-spacing')
  @ApiOperation({ summary: 'Calculate recommended pipe support spacing' })
  @ApiResponse({
    status: 200,
    description: 'Support spacing calculated successfully',
    type: SupportSpacingResponseDto,
  })
  supportSpacing(
    @Body() dto: CalculateSupportSpacingDto,
  ): SupportSpacingResponseDto {
    return this.pipeSteelWorkService.supportSpacing(dto);
  }

  @Post('reinforcement-pad')
  @ApiOperation({ summary: 'Calculate reinforcement pad requirements' })
  @ApiResponse({
    status: 200,
    description: 'Reinforcement pad calculation completed',
    type: ReinforcementPadResponseDto,
  })
  reinforcementPad(
    @Body() dto: CalculateReinforcementPadDto,
  ): ReinforcementPadResponseDto {
    return this.pipeSteelWorkService.reinforcementPad(dto);
  }

  @Get('bracket-types')
  @ApiOperation({ summary: 'Get available bracket types' })
  @ApiQuery({
    name: 'nominalDiameterMm',
    required: false,
    description: 'Filter by pipe nominal diameter',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bracket types',
    type: [BracketTypeResponseDto],
  })
  async bracketTypes(
    @Query('nominalDiameterMm') nominalDiameterMm?: number,
  ): Promise<BracketTypeResponseDto[]> {
    return this.pipeSteelWorkService.bracketTypes(
      nominalDiameterMm ? Number(nominalDiameterMm) : undefined,
    );
  }

  @Post('calculate')
  @ApiOperation({
    summary: 'Perform comprehensive pipe steel work calculation',
  })
  @ApiResponse({
    status: 200,
    description: 'Calculation completed successfully',
    type: PipeSteelWorkCalculationResponseDto,
  })
  calculate(
    @Body() dto: PipeSteelWorkCalculationDto,
  ): PipeSteelWorkCalculationResponseDto {
    return this.pipeSteelWorkService.calculate(dto);
  }

  @Get('pad-standard')
  @ApiOperation({ summary: 'Get standard reinforcement pad dimensions' })
  @ApiQuery({
    name: 'branchNbMm',
    required: true,
    description: 'Branch nominal bore (mm)',
  })
  @ApiQuery({
    name: 'headerNbMm',
    required: true,
    description: 'Header nominal bore (mm)',
  })
  @ApiResponse({
    status: 200,
    description: 'Standard pad dimensions or null if not found',
  })
  async padStandard(
    @Query('branchNbMm') branchNbMm: number,
    @Query('headerNbMm') headerNbMm: number,
  ) {
    return this.pipeSteelWorkService.padStandard(
      Number(branchNbMm),
      Number(headerNbMm),
    );
  }

  @Get('bracket-dimensions')
  @ApiOperation({ summary: 'Get bracket dimensions by type and size' })
  @ApiQuery({
    name: 'bracketTypeCode',
    required: true,
    description: 'Bracket type code (e.g., CLEVIS_HANGER)',
  })
  @ApiQuery({
    name: 'nbMm',
    required: false,
    description: 'Nominal bore (mm) - if omitted, returns all sizes for type',
  })
  @ApiResponse({
    status: 200,
    description: 'Bracket dimensions for specified type/size',
  })
  async bracketDimensions(
    @Query('bracketTypeCode') bracketTypeCode: string,
    @Query('nbMm') nbMm?: number,
  ) {
    if (nbMm) {
      return this.pipeSteelWorkService.bracketDimension(
        bracketTypeCode,
        Number(nbMm),
      );
    }
    return this.pipeSteelWorkService.bracketDimensionsForType(bracketTypeCode);
  }

  @Post('thermal-expansion')
  @ApiOperation({ summary: 'Calculate thermal expansion/contraction of pipe' })
  @ApiResponse({
    status: 200,
    description: 'Thermal expansion calculation completed',
    type: ThermalExpansionResponseDto,
  })
  thermalExpansion(
    @Body() dto: CalculateThermalExpansionDto,
  ): ThermalExpansionResponseDto {
    return this.pipeSteelWorkService.thermalExpansion(dto);
  }

  @Post('validate-bracket')
  @ApiOperation({
    summary: 'Validate bracket compatibility with pipe specifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Bracket compatibility validation completed',
    type: BracketCompatibilityResponseDto,
  })
  async validateBracket(
    @Body() dto: ValidateBracketCompatibilityDto,
  ): Promise<BracketCompatibilityResponseDto> {
    return this.pipeSteelWorkService.validateBracketCompatibility(dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get all configuration values' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiResponse({ status: 200, description: 'Configuration values retrieved' })
  async configs(@Query('category') category?: string) {
    return this.pipeSteelWorkService.allConfigs(category);
  }

  @Get('config/:key')
  @ApiOperation({ summary: 'Get a specific configuration value' })
  @ApiResponse({ status: 200, description: 'Configuration value retrieved' })
  async config(@Param('key') key: string) {
    const value = await this.pipeSteelWorkService.configValue(key);
    return { key, value };
  }

  @Post('config/:key')
  @ApiOperation({ summary: 'Update a configuration value' })
  @ApiResponse({ status: 200, description: 'Configuration value updated' })
  async updateConfig(@Param('key') key: string, @Body('value') value: string) {
    const updated = await this.pipeSteelWorkService.updateConfig(key, value);
    if (!updated) {
      return {
        success: false,
        message: `Configuration key '${key}' not found`,
      };
    }
    return { success: true, config: updated };
  }

  @Post('batch-calculate')
  @ApiOperation({
    summary: 'Perform multiple calculations in a single request',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch calculation completed',
    type: BatchCalculationResponseDto,
  })
  batchCalculate(
    @Body() dto: BatchCalculationDto,
  ): BatchCalculationResponseDto {
    return this.pipeSteelWorkService.batchCalculate(dto);
  }

  @Post('support-spacing/multi-standard')
  @ApiOperation({
    summary:
      'Compare support spacing across multiple standards (MSS-SP-58, DIN, EN, ASME)',
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-standard comparison completed',
    type: MultiStandardSpacingResponseDto,
  })
  supportSpacingMultiStandard(
    @Body() dto: CalculateSupportSpacingMultiStandardDto,
  ): MultiStandardSpacingResponseDto {
    return this.pipeSteelWorkService.supportSpacingMultiStandard(dto);
  }

  @Post('reinforcement-pad/with-derating')
  @ApiOperation({
    summary:
      'Calculate reinforcement pad with pressure/temperature derating factors',
  })
  @ApiResponse({
    status: 200,
    description: 'Reinforcement pad calculation with derating completed',
    type: ReinforcementPadWithDeratingResponseDto,
  })
  reinforcementPadWithDerating(
    @Body() dto: CalculateReinforcementPadWithDeratingDto,
  ): ReinforcementPadWithDeratingResponseDto {
    return this.pipeSteelWorkService.reinforcementPadWithDerating(dto);
  }

  @Post('vibration-analysis')
  @ApiOperation({
    summary: 'Perform vibration/natural frequency analysis for pipe spans',
  })
  @ApiResponse({
    status: 200,
    description: 'Vibration analysis completed',
    type: VibrationAnalysisResponseDto,
  })
  vibrationAnalysis(
    @Body() dto: CalculateVibrationAnalysisDto,
  ): VibrationAnalysisResponseDto {
    return this.pipeSteelWorkService.vibrationAnalysis(dto);
  }

  @Post('stress-analysis')
  @ApiOperation({
    summary: 'Perform stress analysis on bracket/hanger components',
  })
  @ApiResponse({
    status: 200,
    description: 'Stress analysis completed',
    type: StressAnalysisResponseDto,
  })
  async stressAnalysis(
    @Body() dto: CalculateStressAnalysisDto,
  ): Promise<StressAnalysisResponseDto> {
    return this.pipeSteelWorkService.stressAnalysis(dto);
  }

  @Post('material-compatibility')
  @ApiOperation({
    summary: 'Check material compatibility between pipe and bracket materials',
  })
  @ApiResponse({
    status: 200,
    description: 'Material compatibility check completed',
    type: MaterialCompatibilityResponseDto,
  })
  materialCompatibility(
    @Body() dto: MaterialCompatibilityCheckDto,
  ): MaterialCompatibilityResponseDto {
    return this.pipeSteelWorkService.materialCompatibility(dto);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export calculation results to PDF, Excel, or CSV' })
  @ApiResponse({
    status: 200,
    description: 'Report exported successfully',
    type: ExportReportResponseDto,
  })
  exportReport(@Body() dto: ExportReportDto): ExportReportResponseDto {
    return this.pipeSteelWorkService.exportReport(dto);
  }

  @Get('standard-plate-sizes')
  @ApiOperation({
    summary: 'Get standard plate sizes for brackets and compensation plates',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category (small, medium, large)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of standard plate sizes',
    type: [StandardPlateSizeDto],
  })
  standardPlateSizes(
    @Query('category') category?: string,
  ): StandardPlateSizeDto[] {
    return this.pipeSteelWorkService.standardPlateSizes(category);
  }

  @Get('gasket-materials')
  @ApiOperation({
    summary: 'Get available gasket materials with specifications',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by gasket type',
  })
  @ApiResponse({
    status: 200,
    description: 'List of gasket materials',
    type: [GasketMaterialDto],
  })
  gasketMaterials(@Query('type') type?: string): GasketMaterialDto[] {
    return this.pipeSteelWorkService.gasketMaterials(type);
  }

  @Post('gasket-compatibility')
  @ApiOperation({
    summary: 'Check gasket compatibility with service conditions',
  })
  @ApiResponse({
    status: 200,
    description: 'Compatibility check result',
    type: GasketCompatibilityResponseDto,
  })
  gasketCompatibility(
    @Body() dto: GasketCompatibilityCheckDto,
  ): GasketCompatibilityResponseDto {
    return this.pipeSteelWorkService.gasketCompatibility(dto);
  }

  @Get('heat-treatments')
  @ApiOperation({ summary: 'Get available heat treatment options' })
  @ApiResponse({
    status: 200,
    description: 'List of heat treatments',
    type: [HeatTreatmentDto],
  })
  heatTreatments(): HeatTreatmentDto[] {
    return this.pipeSteelWorkService.heatTreatments();
  }

  @Post('heat-treatment-requirement')
  @ApiOperation({
    summary: 'Check if heat treatment is required and get details',
  })
  @ApiResponse({
    status: 200,
    description: 'Heat treatment requirement result',
    type: HeatTreatmentRequirementResponseDto,
  })
  heatTreatmentRequirement(
    @Body() dto: HeatTreatmentRequirementDto,
  ): HeatTreatmentRequirementResponseDto {
    return this.pipeSteelWorkService.heatTreatmentRequirement(dto);
  }
}
