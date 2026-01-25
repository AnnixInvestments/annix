import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipeSupportSpacing } from './entities/pipe-support-spacing.entity';
import { BracketTypeEntity } from './entities/bracket-type.entity';
import { ReinforcementPadStandardEntity } from './entities/reinforcement-pad-standard.entity';
import { BracketDimensionBySizeEntity } from './entities/bracket-dimension-by-size.entity';
import { PipeSteelWorkConfigEntity } from './entities/pipe-steel-work-config.entity';
import {
  CalculateSupportSpacingDto,
  CalculateReinforcementPadDto,
  CalculateNumberOfSupportsDto,
  SupportSpacingResponseDto,
  ReinforcementPadResponseDto,
  BracketTypeResponseDto,
  PipeSteelWorkCalculationDto,
  PipeSteelWorkCalculationResponseDto,
  PipeSteelWorkTypeDto,
  CalculateThermalExpansionDto,
  ThermalExpansionResponseDto,
  PipeMaterialDto,
  ValidateBracketCompatibilityDto,
  BracketCompatibilityResponseDto,
  ValidationIssue,
  BatchCalculationDto,
  BatchCalculationResponseDto,
  BatchCalculationResultDto,
  SupportStandardDto,
  CalculateSupportSpacingMultiStandardDto,
  MultiStandardSpacingResponseDto,
  StandardComparisonDto,
  CalculateReinforcementPadWithDeratingDto,
  ReinforcementPadWithDeratingResponseDto,
  CalculateVibrationAnalysisDto,
  VibrationAnalysisResponseDto,
  CalculateStressAnalysisDto,
  StressAnalysisResponseDto,
  MaterialCompatibilityCheckDto,
  MaterialCompatibilityResponseDto,
  MaterialCategoryDto,
  ExportReportDto,
  ExportReportResponseDto,
  ExportFormatDto,
  StandardPlateSizeDto,
  PlateSizeCategory,
  GasketMaterialDto,
  GasketMaterialType,
  GasketCompatibilityCheckDto,
  GasketCompatibilityResponseDto,
  HeatTreatmentDto,
  HeatTreatmentType,
  HeatTreatmentRequirementDto,
  HeatTreatmentRequirementResponseDto,
} from './dto/pipe-steel-work.dto';

@Injectable()
export class PipeSteelWorkService {
  private readonly STEEL_DENSITY_KG_M3 = 7850;

  private readonly thermalExpansionCoefficients: Record<
    PipeMaterialDto,
    number
  > = {
    [PipeMaterialDto.CARBON_STEEL]: 0.012,
    [PipeMaterialDto.STAINLESS_304]: 0.017,
    [PipeMaterialDto.STAINLESS_316]: 0.016,
    [PipeMaterialDto.COPPER]: 0.017,
    [PipeMaterialDto.ALUMINUM]: 0.023,
    [PipeMaterialDto.CHROME_MOLY]: 0.0125,
    [PipeMaterialDto.CAST_IRON]: 0.01,
    [PipeMaterialDto.PVC]: 0.07,
    [PipeMaterialDto.HDPE]: 0.2,
  };

  private readonly supportSpacingTable: Record<
    number,
    { water: number; vapor: number; rod: number }
  > = {
    15: { water: 2.1, vapor: 2.7, rod: 10 },
    20: { water: 2.4, vapor: 3.0, rod: 10 },
    25: { water: 2.7, vapor: 3.4, rod: 10 },
    32: { water: 3.0, vapor: 3.7, rod: 10 },
    40: { water: 3.0, vapor: 3.7, rod: 10 },
    50: { water: 3.4, vapor: 4.3, rod: 10 },
    65: { water: 3.7, vapor: 4.6, rod: 10 },
    80: { water: 3.7, vapor: 4.6, rod: 10 },
    100: { water: 4.3, vapor: 5.2, rod: 12 },
    125: { water: 4.6, vapor: 5.5, rod: 12 },
    150: { water: 4.9, vapor: 5.8, rod: 16 },
    200: { water: 5.2, vapor: 6.4, rod: 16 },
    250: { water: 5.8, vapor: 7.0, rod: 20 },
    300: { water: 6.4, vapor: 7.6, rod: 20 },
    350: { water: 6.7, vapor: 7.9, rod: 24 },
    400: { water: 7.0, vapor: 8.2, rod: 24 },
    450: { water: 7.3, vapor: 8.5, rod: 24 },
    500: { water: 7.6, vapor: 8.8, rod: 30 },
    600: { water: 7.9, vapor: 9.1, rod: 30 },
    750: { water: 8.5, vapor: 9.8, rod: 36 },
    900: { water: 9.1, vapor: 10.4, rod: 36 },
  };

  private readonly nbToOdMap: Record<number, number> = {
    15: 21.3,
    20: 26.7,
    25: 33.4,
    32: 42.2,
    40: 48.3,
    50: 60.3,
    65: 73.0,
    80: 88.9,
    100: 114.3,
    125: 141.3,
    150: 168.3,
    200: 219.1,
    250: 273.1,
    300: 323.9,
    350: 355.6,
    400: 406.4,
    450: 457.0,
    500: 508.0,
    600: 610.0,
    750: 762.0,
    900: 914.0,
  };

  private configCache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(PipeSupportSpacing)
    private readonly supportSpacingRepository: Repository<PipeSupportSpacing>,
    @InjectRepository(BracketTypeEntity)
    private readonly bracketTypeRepository: Repository<BracketTypeEntity>,
    @InjectRepository(ReinforcementPadStandardEntity)
    private readonly padStandardRepository: Repository<ReinforcementPadStandardEntity>,
    @InjectRepository(BracketDimensionBySizeEntity)
    private readonly bracketDimensionRepository: Repository<BracketDimensionBySizeEntity>,
    @InjectRepository(PipeSteelWorkConfigEntity)
    private readonly configRepository: Repository<PipeSteelWorkConfigEntity>,
  ) {}

  async configValue(
    key: string,
    defaultValue?: string,
  ): Promise<string | null> {
    if (this.configCache.has(key)) {
      return this.configCache.get(key) || defaultValue || null;
    }

    const config = await this.configRepository.findOne({
      where: { configKey: key },
    });
    if (config) {
      this.configCache.set(key, config.configValue);
      return config.configValue;
    }

    return defaultValue || null;
  }

  async configNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.configValue(key);
    if (value !== null) {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  async allConfigs(category?: string): Promise<PipeSteelWorkConfigEntity[]> {
    if (category) {
      return this.configRepository.find({
        where: { category },
        order: { configKey: 'ASC' },
      });
    }
    return this.configRepository.find({
      order: { category: 'ASC', configKey: 'ASC' },
    });
  }

  async updateConfig(
    key: string,
    value: string,
  ): Promise<PipeSteelWorkConfigEntity | null> {
    const config = await this.configRepository.findOne({
      where: { configKey: key },
    });
    if (!config) {
      return null;
    }
    config.configValue = value;
    this.configCache.delete(key);
    return this.configRepository.save(config);
  }

  async padStandard(
    branchNbMm: number,
    headerNbMm: number,
  ): Promise<ReinforcementPadStandardEntity | null> {
    return this.padStandardRepository.findOne({
      where: { branchNbMm, headerNbMm },
    });
  }

  async bracketDimension(
    bracketTypeCode: string,
    nbMm: number,
  ): Promise<BracketDimensionBySizeEntity | null> {
    return this.bracketDimensionRepository.findOne({
      where: { bracketTypeCode, nbMm },
    });
  }

  async bracketDimensionsForType(
    bracketTypeCode: string,
  ): Promise<BracketDimensionBySizeEntity[]> {
    return this.bracketDimensionRepository.find({
      where: { bracketTypeCode },
      order: { nbMm: 'ASC' },
    });
  }

  supportSpacing(dto: CalculateSupportSpacingDto): SupportSpacingResponseDto {
    const nbMm = this.findClosestNb(dto.nominalDiameterMm);
    const spacing = this.supportSpacingTable[nbMm];

    if (!spacing) {
      const defaultSpacing = this.interpolateSpacing(dto.nominalDiameterMm);
      return {
        nominalDiameterMm: dto.nominalDiameterMm,
        waterFilledSpacingM: defaultSpacing.water,
        vaporGasSpacingM: defaultSpacing.vapor,
        rodSizeMm: defaultSpacing.rod,
        standard: 'MSS-SP-58 (interpolated)',
      };
    }

    return {
      nominalDiameterMm: dto.nominalDiameterMm,
      waterFilledSpacingM: spacing.water,
      vaporGasSpacingM: spacing.vapor,
      rodSizeMm: spacing.rod,
      standard: 'MSS-SP-58',
    };
  }

  reinforcementPad(
    dto: CalculateReinforcementPadDto,
  ): ReinforcementPadResponseDto {
    const {
      headerOdMm,
      headerWallMm,
      branchOdMm,
      branchWallMm,
      workingPressureBar,
      allowableStressMpa,
    } = dto;

    const branchAngleDeg = 90;
    const sinBeta = Math.sin((branchAngleDeg * Math.PI) / 180);
    const corrosionAllowance = 1.6;

    const headerIdMm = headerOdMm - 2 * headerWallMm;
    const branchIdMm = branchOdMm - 2 * branchWallMm;

    const pressure = workingPressureBar ? workingPressureBar / 10 : 10;
    const allowableStress = allowableStressMpa || 138;
    const jointEfficiency = 1.0;
    const yCoeff = 0.4;

    const designHeaderWall =
      (pressure * headerOdMm) /
      (2 * (allowableStress * jointEfficiency + pressure * yCoeff));
    const designBranchWall =
      (pressure * branchOdMm) /
      (2 * (allowableStress * jointEfficiency + pressure * yCoeff));

    const d1 = branchIdMm;
    const Th = headerWallMm;
    const Tb = branchWallMm;
    const th = Math.max(designHeaderWall, 3.0);
    const tb = Math.max(designBranchWall, 3.0);
    const c = corrosionAllowance;

    const d2Candidate1 = d1;
    const d2Candidate2 = Tb - c + (Th - c) + d1 / 2;
    const d2 = Math.max(d2Candidate1, d2Candidate2);

    const A1 = th * d1 * (2 - sinBeta);

    const excessHeader = Th - th - c;
    const A2 = excessHeader > 0 ? (2 * d2 - d1) * excessHeader : 0;

    const L4 = Math.min(2.5 * (Th - c), 2.5 * (Tb - c));
    const excessBranch = Tb - tb - c;
    const A3 = excessBranch > 0 ? (2 * L4 * excessBranch) / sinBeta : 0;

    const requiredArea = A1;
    const availableArea = A2 + A3;
    const areaDeficit = requiredArea - availableArea;

    const reinforcementRequired = areaDeficit > 0;

    let padOuterDiameter = 0;
    let padThickness = 0;
    let padWeight = 0;
    let A4 = 0;

    if (reinforcementRequired) {
      padThickness = Math.max(Th, Math.ceil(areaDeficit / (2 * d2)));
      padThickness = Math.ceil(padThickness / 2) * 2;
      padThickness = Math.min(padThickness, 19);

      padOuterDiameter = branchOdMm + 2 * d2;
      padOuterDiameter = Math.ceil(padOuterDiameter / 10) * 10;

      const padInnerDiameter = branchOdMm + 3;
      A4 = (padOuterDiameter - padInnerDiameter) * padThickness;

      const totalAvailable = A2 + A3 + A4;
      if (totalAvailable < A1) {
        const additionalNeeded = A1 - totalAvailable;
        padOuterDiameter += Math.ceil(additionalNeeded / padThickness / 2) * 10;
      }

      const padArea =
        (Math.PI / 4) *
        (Math.pow(padOuterDiameter, 2) - Math.pow(padInnerDiameter, 2));
      const padVolume = (padArea * padThickness) / 1e9;
      padWeight = padVolume * this.STEEL_DENSITY_KG_M3;
    }

    const notes = reinforcementRequired
      ? `ASME B31.3 §304.3.3: A1(req)=${Math.round(A1)}mm², A2(header)=${Math.round(A2)}mm², A3(branch)=${Math.round(A3)}mm², A4(pad)=${Math.round(A4)}mm². Deficit: ${Math.round(areaDeficit)}mm²`
      : `No pad required. A1(req)=${Math.round(A1)}mm², Available: A2=${Math.round(A2)}mm² + A3=${Math.round(A3)}mm² = ${Math.round(availableArea)}mm²`;

    return {
      requiredAreaMm2: Math.round(requiredArea),
      padOuterDiameterMm: padOuterDiameter,
      padThicknessMm: padThickness,
      padWeightKg: Math.round(padWeight * 100) / 100,
      reinforcementRequired,
      notes,
    };
  }

  calculateNumberOfSupports(dto: CalculateNumberOfSupportsDto): number {
    const { pipelineLengthM, supportSpacingM } = dto;
    return Math.ceil(pipelineLengthM / supportSpacingM) + 1;
  }

  async bracketTypes(
    nominalDiameterMm?: number,
  ): Promise<BracketTypeResponseDto[]> {
    const defaultBrackets: BracketTypeResponseDto[] = [
      {
        typeCode: 'CLEVIS_HANGER',
        displayName: 'Clevis Hanger',
        description: 'For suspended pipelines, allows slight movement',
        isSuitable: true,
        baseCostPerUnit: 150,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'THREE_BOLT_CLAMP',
        displayName: 'Three-Bolt Pipe Clamp',
        description: 'Heavy-duty support for larger pipes',
        isSuitable: nominalDiameterMm ? nominalDiameterMm >= 100 : true,
        baseCostPerUnit: 250,
        allowsExpansion: false,
        isAnchorType: false,
      },
      {
        typeCode: 'WELDED_BRACKET',
        displayName: 'Welded Bracket',
        description: 'Fixed support welded to structure',
        isSuitable: true,
        baseCostPerUnit: 180,
        allowsExpansion: false,
        isAnchorType: true,
      },
      {
        typeCode: 'PIPE_SADDLE',
        displayName: 'Pipe Saddle',
        description: 'Base-mounted support with curved cradle',
        isSuitable: nominalDiameterMm ? nominalDiameterMm >= 150 : true,
        baseCostPerUnit: 280,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'U_BOLT',
        displayName: 'U-Bolt Clamp',
        description: 'Simple, economical support for smaller pipes',
        isSuitable: nominalDiameterMm ? nominalDiameterMm <= 150 : true,
        baseCostPerUnit: 80,
        allowsExpansion: false,
        isAnchorType: false,
      },
      {
        typeCode: 'ROLLER_SUPPORT',
        displayName: 'Roller Support',
        description: 'Allows axial thermal expansion movement',
        isSuitable: true,
        baseCostPerUnit: 450,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'SLIDE_PLATE',
        displayName: 'Slide Plate',
        description: 'Low-friction support for thermal expansion',
        isSuitable: nominalDiameterMm ? nominalDiameterMm >= 200 : true,
        baseCostPerUnit: 350,
        allowsExpansion: true,
        isAnchorType: false,
      },
    ];

    return defaultBrackets;
  }

  calculate(
    dto: PipeSteelWorkCalculationDto,
  ): PipeSteelWorkCalculationResponseDto {
    const response: PipeSteelWorkCalculationResponseDto = {
      workType: dto.workType,
    };

    if (dto.workType === PipeSteelWorkTypeDto.PIPE_SUPPORT) {
      const spacing = this.supportSpacing({
        nominalDiameterMm: dto.nominalDiameterMm,
        scheduleNumber: dto.scheduleNumber,
        isWaterFilled: true,
      });

      response.supportSpacingM = spacing.waterFilledSpacingM;

      if (dto.pipelineLengthM) {
        response.numberOfSupports = this.calculateNumberOfSupports({
          pipelineLengthM: dto.pipelineLengthM,
          supportSpacingM: spacing.waterFilledSpacingM,
        });

        const bracketWeight = this.estimateBracketWeight(
          dto.nominalDiameterMm,
          dto.bracketType,
        );
        response.weightPerUnitKg = bracketWeight;
        response.totalWeightKg =
          Math.round(bracketWeight * response.numberOfSupports * 100) / 100;

        const baseCost = this.estimateBracketCost(dto.bracketType);
        response.unitCost = baseCost;
        response.totalCost = baseCost * response.numberOfSupports;
      }

      response.notes = `Support spacing per MSS-SP-58 for water-filled pipe. Rod size: ${spacing.rodSizeMm}mm`;
    }

    if (dto.workType === PipeSteelWorkTypeDto.REINFORCEMENT_PAD) {
      const od = this.nbToOdMap[dto.nominalDiameterMm] || dto.nominalDiameterMm;
      const wallThickness = this.estimateWallThickness(
        dto.nominalDiameterMm,
        dto.scheduleNumber,
      );
      const branchOd = dto.branchDiameterMm
        ? this.nbToOdMap[dto.branchDiameterMm] || dto.branchDiameterMm
        : od / 2;
      const branchWall = this.estimateWallThickness(
        dto.branchDiameterMm || dto.nominalDiameterMm / 2,
        dto.scheduleNumber,
      );

      const padResult = this.reinforcementPad({
        headerOdMm: od,
        headerWallMm: wallThickness,
        branchOdMm: branchOd,
        branchWallMm: branchWall,
        workingPressureBar: dto.workingPressureBar,
      });

      response.reinforcementPad = padResult;
      response.weightPerUnitKg = padResult.padWeightKg;
      response.totalWeightKg =
        Math.round(padResult.padWeightKg * (dto.quantity || 1) * 100) / 100;

      const steelPricePerKg = 25;
      const fabricationFactor = 2.5;
      response.unitCost = Math.round(
        padResult.padWeightKg * steelPricePerKg * fabricationFactor,
      );
      response.totalCost = response.unitCost * (dto.quantity || 1);

      response.notes = padResult.notes;
    }

    return response;
  }

  thermalExpansion(
    dto: CalculateThermalExpansionDto,
  ): ThermalExpansionResponseDto {
    const {
      pipeLengthM,
      installationTempC,
      operatingTempC,
      material,
      customCoefficientMmPerMPerC,
    } = dto;

    const selectedMaterial = material || PipeMaterialDto.CARBON_STEEL;
    const coefficient =
      customCoefficientMmPerMPerC ||
      this.thermalExpansionCoefficients[selectedMaterial];

    const temperatureChange = operatingTempC - installationTempC;
    const isExpansion = temperatureChange > 0;

    const expansionMm = coefficient * pipeLengthM * Math.abs(temperatureChange);
    const expansionPerMeter = coefficient * Math.abs(temperatureChange);

    const recommendedJointCapacity = Math.ceil((expansionMm * 1.25) / 25) * 25;

    const maxJointMovement = 100;
    const recommendedJoints =
      expansionMm > maxJointMovement
        ? Math.ceil(expansionMm / maxJointMovement)
        : 1;

    const materialNames: Record<PipeMaterialDto, string> = {
      [PipeMaterialDto.CARBON_STEEL]: 'Carbon Steel (ASTM A106/A53)',
      [PipeMaterialDto.STAINLESS_304]: 'Stainless Steel 304',
      [PipeMaterialDto.STAINLESS_316]: 'Stainless Steel 316',
      [PipeMaterialDto.COPPER]: 'Copper',
      [PipeMaterialDto.ALUMINUM]: 'Aluminum',
      [PipeMaterialDto.CHROME_MOLY]: 'Chrome-Moly Steel (ASTM A335)',
      [PipeMaterialDto.CAST_IRON]: 'Cast Iron',
      [PipeMaterialDto.PVC]: 'PVC',
      [PipeMaterialDto.HDPE]: 'HDPE',
    };

    const notes = this.buildThermalExpansionNotes(
      selectedMaterial,
      coefficient,
      temperatureChange,
      expansionMm,
      recommendedJoints,
    );

    return {
      pipeLengthM,
      temperatureChangeC: temperatureChange,
      material: customCoefficientMmPerMPerC
        ? 'Custom'
        : materialNames[selectedMaterial],
      coefficientMmPerMPerC: coefficient,
      expansionMm: Math.round(expansionMm * 100) / 100,
      expansionPerMeterMm: Math.round(expansionPerMeter * 1000) / 1000,
      isExpansion,
      recommendedJointCapacityMm: recommendedJointCapacity,
      recommendedJointsCount: recommendedJoints,
      notes,
    };
  }

  private buildThermalExpansionNotes(
    material: PipeMaterialDto,
    coefficient: number,
    tempChange: number,
    expansion: number,
    joints: number,
  ): string {
    const direction = tempChange > 0 ? 'expansion' : 'contraction';
    const absExpansion = Math.abs(expansion);

    let note = `Thermal ${direction}: ΔL = α × L × ΔT = ${coefficient} × L × ${Math.abs(tempChange)}°C. `;

    if (absExpansion < 10) {
      note += 'Minor movement - standard guides/anchors may suffice. ';
    } else if (absExpansion < 50) {
      note +=
        'Moderate movement - consider expansion loops or bellows joints. ';
    } else {
      note += 'Significant movement - expansion joints required. ';
    }

    if (joints > 1) {
      note += `Recommend ${joints} expansion joints to distribute movement. `;
    }

    if (material === PipeMaterialDto.PVC || material === PipeMaterialDto.HDPE) {
      note +=
        'Note: Plastic materials have high expansion rates - ensure adequate guide spacing.';
    }

    return note;
  }

  async validateBracketCompatibility(
    dto: ValidateBracketCompatibilityDto,
  ): Promise<BracketCompatibilityResponseDto> {
    const issues: ValidationIssue[] = [];
    const {
      bracketTypeCode,
      nominalDiameterMm,
      pipelineLengthM,
      schedule,
      isWaterFilled,
      expectedExpansionMm,
    } = dto;

    const bracketSizeRanges: Record<string, { min: number; max: number }> = {
      CLEVIS_HANGER: { min: 15, max: 600 },
      THREE_BOLT_CLAMP: { min: 100, max: 600 },
      WELDED_BRACKET: { min: 15, max: 600 },
      PIPE_SADDLE: { min: 150, max: 900 },
      U_BOLT: { min: 15, max: 150 },
      ROLLER_SUPPORT: { min: 15, max: 600 },
      SLIDE_PLATE: { min: 200, max: 600 },
      BAND_HANGER: { min: 15, max: 100 },
      SPRING_HANGER: { min: 50, max: 600 },
      RISER_CLAMP: { min: 25, max: 350 },
      CONSTANT_SUPPORT: { min: 50, max: 600 },
    };

    const expansionBrackets = [
      'ROLLER_SUPPORT',
      'SLIDE_PLATE',
      'SPRING_HANGER',
      'CLEVIS_HANGER',
      'PIPE_SADDLE',
    ];
    const anchorBrackets = [
      'WELDED_BRACKET',
      'THREE_BOLT_CLAMP',
      'RISER_CLAMP',
    ];

    const range = bracketSizeRanges[bracketTypeCode.toUpperCase()];
    if (!range) {
      issues.push({
        severity: 'error',
        code: 'UNKNOWN_BRACKET_TYPE',
        message: `Unknown bracket type: ${bracketTypeCode}`,
      });
    } else {
      if (nominalDiameterMm < range.min) {
        issues.push({
          severity: 'error',
          code: 'PIPE_TOO_SMALL',
          message: `Pipe size ${nominalDiameterMm}mm is below minimum ${range.min}mm for ${bracketTypeCode}`,
        });
      }
      if (nominalDiameterMm > range.max) {
        issues.push({
          severity: 'error',
          code: 'PIPE_TOO_LARGE',
          message: `Pipe size ${nominalDiameterMm}mm exceeds maximum ${range.max}mm for ${bracketTypeCode}`,
        });
      }
    }

    let estimatedLoadKg: number | undefined;
    let bracketMaxLoadKg: number | undefined;
    let loadUtilizationPercent: number | undefined;

    if (pipelineLengthM) {
      const spacing = this.supportSpacing({
        nominalDiameterMm,
        scheduleNumber: schedule,
        isWaterFilled,
      });
      const spacingM =
        isWaterFilled !== false
          ? spacing.waterFilledSpacingM
          : spacing.vaporGasSpacingM;

      const pipeWeight = this.estimatePipeWeightPerMeter(
        nominalDiameterMm,
        schedule,
        isWaterFilled !== false,
      );
      estimatedLoadKg = Math.round(pipeWeight * spacingM * 1.25 * 100) / 100;

      const bracketDimension = await this.bracketDimension(
        bracketTypeCode.toUpperCase(),
        nominalDiameterMm,
      );
      if (bracketDimension) {
        bracketMaxLoadKg = bracketDimension.maxLoadKg;
        loadUtilizationPercent = Math.round(
          (estimatedLoadKg / bracketMaxLoadKg) * 100,
        );

        if (loadUtilizationPercent > 100) {
          issues.push({
            severity: 'error',
            code: 'LOAD_EXCEEDS_CAPACITY',
            message: `Estimated load ${estimatedLoadKg}kg exceeds bracket capacity ${bracketMaxLoadKg}kg (${loadUtilizationPercent}% utilization)`,
          });
        } else if (loadUtilizationPercent > 80) {
          issues.push({
            severity: 'warning',
            code: 'HIGH_LOAD_UTILIZATION',
            message: `High load utilization at ${loadUtilizationPercent}%. Consider a higher-capacity bracket.`,
          });
        }
      }
    }

    if (expectedExpansionMm && expectedExpansionMm > 10) {
      const isExpansionBracket = expansionBrackets.includes(
        bracketTypeCode.toUpperCase(),
      );
      if (!isExpansionBracket) {
        issues.push({
          severity: 'warning',
          code: 'EXPANSION_NOT_ACCOMMODATED',
          message: `${bracketTypeCode} does not allow thermal movement. Expected expansion: ${expectedExpansionMm}mm. Consider roller or slide plate supports.`,
        });
      }
    }

    if (expectedExpansionMm === 0 || expectedExpansionMm === undefined) {
      const isAnchor = anchorBrackets.includes(bracketTypeCode.toUpperCase());
      if (!isAnchor) {
        issues.push({
          severity: 'info',
          code: 'NOT_ANCHOR_TYPE',
          message: `${bracketTypeCode} allows movement. If this is an anchor point, consider welded bracket or three-bolt clamp.`,
        });
      }
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const hasWarnings = issues.some((i) => i.severity === 'warning');

    let recommendation: string;
    if (hasErrors) {
      recommendation = 'Not recommended. Please address the errors above.';
    } else if (hasWarnings) {
      recommendation = 'Acceptable with caution. Review warnings above.';
    } else if (issues.length === 0) {
      recommendation =
        'Excellent choice. Bracket is well-suited for this application.';
    } else {
      recommendation = 'Acceptable. Review informational notes above.';
    }

    return {
      isCompatible: !hasErrors,
      bracketTypeCode,
      nominalDiameterMm,
      issues,
      estimatedLoadKg,
      bracketMaxLoadKg,
      loadUtilizationPercent,
      recommendation,
    };
  }

  private estimatePipeWeightPerMeter(
    nbMm: number,
    schedule?: string,
    waterFilled = true,
  ): number {
    const od = this.nbToOdMap[nbMm] || nbMm * 1.1;
    const wall = this.estimateWallThickness(nbMm, schedule);
    const id = od - 2 * wall;

    const steelArea = (Math.PI / 4) * (Math.pow(od, 2) - Math.pow(id, 2));
    const steelWeight = (steelArea / 1e6) * this.STEEL_DENSITY_KG_M3;

    let waterWeight = 0;
    if (waterFilled) {
      const waterArea = (Math.PI / 4) * Math.pow(id, 2);
      waterWeight = (waterArea / 1e6) * 1000;
    }

    return steelWeight + waterWeight;
  }

  private findClosestNb(diameterMm: number): number {
    const nbSizes = Object.keys(this.supportSpacingTable).map(Number);
    let closest = nbSizes[0];
    let minDiff = Math.abs(diameterMm - closest);

    for (const nb of nbSizes) {
      const diff = Math.abs(diameterMm - nb);
      if (diff < minDiff) {
        minDiff = diff;
        closest = nb;
      }
    }

    return closest;
  }

  private interpolateSpacing(diameterMm: number): {
    water: number;
    vapor: number;
    rod: number;
  } {
    const nbSizes = Object.keys(this.supportSpacingTable)
      .map(Number)
      .sort((a, b) => a - b);

    if (diameterMm <= nbSizes[0]) {
      return this.supportSpacingTable[nbSizes[0]];
    }
    if (diameterMm >= nbSizes[nbSizes.length - 1]) {
      return this.supportSpacingTable[nbSizes[nbSizes.length - 1]];
    }

    let lowerNb = nbSizes[0];
    let upperNb = nbSizes[nbSizes.length - 1];

    for (let i = 0; i < nbSizes.length - 1; i++) {
      if (diameterMm >= nbSizes[i] && diameterMm <= nbSizes[i + 1]) {
        lowerNb = nbSizes[i];
        upperNb = nbSizes[i + 1];
        break;
      }
    }

    const lowerSpacing = this.supportSpacingTable[lowerNb];
    const upperSpacing = this.supportSpacingTable[upperNb];

    const ratio = (diameterMm - lowerNb) / (upperNb - lowerNb);

    return {
      water:
        Math.round(
          (lowerSpacing.water +
            ratio * (upperSpacing.water - lowerSpacing.water)) *
            10,
        ) / 10,
      vapor:
        Math.round(
          (lowerSpacing.vapor +
            ratio * (upperSpacing.vapor - lowerSpacing.vapor)) *
            10,
        ) / 10,
      rod: lowerSpacing.rod,
    };
  }

  private estimateBracketWeight(
    nominalDiameterMm: number,
    bracketType?: string,
  ): number {
    const baseWeight = 0.5 + (nominalDiameterMm / 100) * 1.5;

    const multipliers: Record<string, number> = {
      clevis_hanger: 0.8,
      three_bolt_clamp: 1.5,
      welded_bracket: 2.0,
      pipe_saddle: 2.5,
      u_bolt: 0.5,
      roller_support: 3.0,
      slide_plate: 2.5,
    };

    const multiplier = bracketType ? multipliers[bracketType] || 1.0 : 1.0;
    return Math.round(baseWeight * multiplier * 100) / 100;
  }

  private estimateBracketCost(bracketType?: string): number {
    const costs: Record<string, number> = {
      clevis_hanger: 150,
      three_bolt_clamp: 250,
      welded_bracket: 180,
      pipe_saddle: 280,
      u_bolt: 80,
      band_hanger: 120,
      roller_support: 450,
      slide_plate: 350,
    };

    return bracketType ? costs[bracketType] || 200 : 200;
  }

  private estimateWallThickness(
    nominalDiameterMm: number,
    schedule?: string,
  ): number {
    const scheduleWalls: Record<string, Record<number, number>> = {
      Std: {
        50: 3.91,
        80: 5.49,
        100: 6.02,
        150: 7.11,
        200: 8.18,
        250: 9.27,
        300: 9.53,
        350: 9.53,
        400: 9.53,
        500: 9.53,
        600: 9.53,
      },
      Sch40: {
        50: 3.91,
        80: 5.49,
        100: 6.02,
        150: 7.11,
        200: 8.18,
        250: 9.27,
        300: 10.31,
        350: 11.13,
        400: 12.7,
        500: 12.7,
        600: 14.27,
      },
    };

    const closestNb = this.findClosestNb(nominalDiameterMm);
    const scheduleData =
      scheduleWalls[schedule || 'Std'] || scheduleWalls['Std'];

    return scheduleData[closestNb] || 6.0;
  }

  batchCalculate(dto: BatchCalculationDto): BatchCalculationResponseDto {
    const results: BatchCalculationResultDto[] = dto.items.map((item) => {
      try {
        const result = this.calculate({
          workType: item.workType,
          nominalDiameterMm: item.nominalDiameterMm,
          scheduleNumber: item.scheduleNumber,
          bracketType: item.bracketType,
          pipelineLengthM: item.pipelineLengthM,
          workingPressureBar: item.workingPressureBar,
          branchDiameterMm: item.branchDiameterMm,
          quantity: item.quantity,
        });
        return { itemId: item.itemId, success: true, result };
      } catch (error) {
        return {
          itemId: item.itemId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const successResults = results.filter((r) => r.success && r.result);

    return {
      totalItems: dto.items.length,
      successCount: successResults.length,
      failureCount: dto.items.length - successResults.length,
      results,
      summary: {
        totalWeightKg: successResults.reduce(
          (sum, r) => sum + (r.result?.totalWeightKg || 0),
          0,
        ),
        totalCost: successResults.reduce(
          (sum, r) => sum + (r.result?.totalCost || 0),
          0,
        ),
        totalSupports: successResults.reduce(
          (sum, r) => sum + (r.result?.numberOfSupports || 0),
          0,
        ),
      },
    };
  }

  private readonly standardSpacingTables: Record<
    SupportStandardDto,
    Record<number, { water: number; vapor: number; rod?: number }>
  > = {
    [SupportStandardDto.MSS_SP_58]: this.supportSpacingTable,
    [SupportStandardDto.DIN_2509]: {
      15: { water: 1.8, vapor: 2.3 },
      20: { water: 2.0, vapor: 2.5 },
      25: { water: 2.3, vapor: 2.8 },
      32: { water: 2.5, vapor: 3.0 },
      40: { water: 2.5, vapor: 3.0 },
      50: { water: 2.8, vapor: 3.5 },
      65: { water: 3.0, vapor: 3.8 },
      80: { water: 3.0, vapor: 3.8 },
      100: { water: 3.5, vapor: 4.3 },
      125: { water: 3.8, vapor: 4.5 },
      150: { water: 4.0, vapor: 4.8 },
      200: { water: 4.3, vapor: 5.3 },
      250: { water: 4.8, vapor: 5.8 },
      300: { water: 5.3, vapor: 6.3 },
      350: { water: 5.5, vapor: 6.5 },
      400: { water: 5.8, vapor: 6.8 },
      450: { water: 6.0, vapor: 7.0 },
      500: { water: 6.3, vapor: 7.3 },
      600: { water: 6.5, vapor: 7.5 },
    },
    [SupportStandardDto.EN_13480]: {
      15: { water: 2.0, vapor: 2.5 },
      20: { water: 2.2, vapor: 2.8 },
      25: { water: 2.5, vapor: 3.2 },
      32: { water: 2.8, vapor: 3.5 },
      40: { water: 2.8, vapor: 3.5 },
      50: { water: 3.2, vapor: 4.0 },
      65: { water: 3.5, vapor: 4.3 },
      80: { water: 3.5, vapor: 4.3 },
      100: { water: 4.0, vapor: 4.8 },
      125: { water: 4.3, vapor: 5.2 },
      150: { water: 4.5, vapor: 5.5 },
      200: { water: 4.8, vapor: 6.0 },
      250: { water: 5.5, vapor: 6.5 },
      300: { water: 6.0, vapor: 7.0 },
      350: { water: 6.3, vapor: 7.3 },
      400: { water: 6.5, vapor: 7.5 },
      450: { water: 6.8, vapor: 7.8 },
      500: { water: 7.0, vapor: 8.0 },
      600: { water: 7.3, vapor: 8.5 },
    },
    [SupportStandardDto.ASME_B31_1]: {
      15: { water: 2.1, vapor: 2.7 },
      20: { water: 2.4, vapor: 3.0 },
      25: { water: 2.7, vapor: 3.4 },
      32: { water: 3.0, vapor: 3.7 },
      40: { water: 3.0, vapor: 3.7 },
      50: { water: 3.4, vapor: 4.3 },
      65: { water: 3.7, vapor: 4.6 },
      80: { water: 3.7, vapor: 4.6 },
      100: { water: 4.0, vapor: 4.9 },
      125: { water: 4.3, vapor: 5.2 },
      150: { water: 4.6, vapor: 5.5 },
      200: { water: 4.9, vapor: 6.1 },
      250: { water: 5.5, vapor: 6.7 },
      300: { water: 6.1, vapor: 7.3 },
      350: { water: 6.4, vapor: 7.6 },
      400: { water: 6.7, vapor: 7.9 },
      450: { water: 7.0, vapor: 8.2 },
      500: { water: 7.3, vapor: 8.5 },
      600: { water: 7.6, vapor: 8.8 },
    },
    [SupportStandardDto.ASME_B31_3]: {
      15: { water: 2.1, vapor: 2.7 },
      20: { water: 2.4, vapor: 3.0 },
      25: { water: 2.7, vapor: 3.4 },
      32: { water: 3.0, vapor: 3.7 },
      40: { water: 3.0, vapor: 3.7 },
      50: { water: 3.4, vapor: 4.3 },
      65: { water: 3.7, vapor: 4.6 },
      80: { water: 3.7, vapor: 4.6 },
      100: { water: 4.3, vapor: 5.2 },
      125: { water: 4.6, vapor: 5.5 },
      150: { water: 4.9, vapor: 5.8 },
      200: { water: 5.2, vapor: 6.4 },
      250: { water: 5.8, vapor: 7.0 },
      300: { water: 6.4, vapor: 7.6 },
      350: { water: 6.7, vapor: 7.9 },
      400: { water: 7.0, vapor: 8.2 },
      450: { water: 7.3, vapor: 8.5 },
      500: { water: 7.6, vapor: 8.8 },
      600: { water: 7.9, vapor: 9.1 },
    },
  };

  private readonly standardFullNames: Record<SupportStandardDto, string> = {
    [SupportStandardDto.MSS_SP_58]:
      'Manufacturers Standardization Society SP-58',
    [SupportStandardDto.DIN_2509]: 'Deutsches Institut für Normung 2509',
    [SupportStandardDto.EN_13480]:
      'European Standard EN 13480 - Metallic Industrial Piping',
    [SupportStandardDto.ASME_B31_1]: 'ASME B31.1 - Power Piping',
    [SupportStandardDto.ASME_B31_3]: 'ASME B31.3 - Process Piping',
  };

  supportSpacingMultiStandard(
    dto: CalculateSupportSpacingMultiStandardDto,
  ): MultiStandardSpacingResponseDto {
    const standards = dto.standards?.length
      ? dto.standards
      : Object.values(SupportStandardDto);
    const nbMm = this.findClosestNb(dto.nominalDiameterMm);

    const comparisons: StandardComparisonDto[] = standards.map((standard) => {
      const table = this.standardSpacingTables[standard];
      const spacing =
        table[nbMm] ||
        this.interpolateSpacingFromTable(dto.nominalDiameterMm, table);

      return {
        standard,
        standardFullName: this.standardFullNames[standard],
        waterFilledSpacingM: spacing.water,
        vaporGasSpacingM: spacing.vapor,
        rodSizeMm: spacing.rod,
        notes:
          standard === SupportStandardDto.DIN_2509
            ? 'More conservative European approach'
            : undefined,
      };
    });

    const conservativeRecommendation = comparisons.reduce((min, curr) =>
      curr.waterFilledSpacingM < min.waterFilledSpacingM ? curr : min,
    );

    return {
      nominalDiameterMm: dto.nominalDiameterMm,
      comparisons,
      conservativeRecommendation,
    };
  }

  private interpolateSpacingFromTable(
    diameterMm: number,
    table: Record<number, { water: number; vapor: number; rod?: number }>,
  ): { water: number; vapor: number; rod?: number } {
    const sizes = Object.keys(table)
      .map(Number)
      .sort((a, b) => a - b);

    if (diameterMm <= sizes[0]) return table[sizes[0]];
    if (diameterMm >= sizes[sizes.length - 1])
      return table[sizes[sizes.length - 1]];

    let lower = sizes[0];
    let upper = sizes[sizes.length - 1];

    for (let i = 0; i < sizes.length - 1; i++) {
      if (diameterMm >= sizes[i] && diameterMm <= sizes[i + 1]) {
        lower = sizes[i];
        upper = sizes[i + 1];
        break;
      }
    }

    const ratio = (diameterMm - lower) / (upper - lower);
    const lowerVal = table[lower];
    const upperVal = table[upper];

    return {
      water:
        Math.round(
          (lowerVal.water + ratio * (upperVal.water - lowerVal.water)) * 10,
        ) / 10,
      vapor:
        Math.round(
          (lowerVal.vapor + ratio * (upperVal.vapor - lowerVal.vapor)) * 10,
        ) / 10,
      rod: lowerVal.rod,
    };
  }

  private readonly temperatureDeratingFactors: Record<number, number> = {
    20: 1.0,
    100: 1.0,
    150: 0.98,
    200: 0.95,
    250: 0.91,
    300: 0.86,
    350: 0.8,
    400: 0.73,
    450: 0.65,
    500: 0.55,
  };

  private readonly weldStrengthFactors: Record<string, number> = {
    full_penetration: 1.0,
    fillet: 0.55,
  };

  reinforcementPadWithDerating(
    dto: CalculateReinforcementPadWithDeratingDto,
  ): ReinforcementPadWithDeratingResponseDto {
    const tempDeratingFactor = this.interpolateTemperatureDerating(
      dto.operatingTempC || 20,
    );
    const weldFactor =
      this.weldStrengthFactors[dto.jointType || 'full_penetration'];
    const pressureDeratingFactor =
      dto.workingPressureBar && dto.workingPressureBar > 100 ? 0.9 : 1.0;

    const effectiveAllowableStress =
      (dto.allowableStressMpa || 138) *
      tempDeratingFactor *
      pressureDeratingFactor;

    const baseResult = this.reinforcementPad({
      ...dto,
      allowableStressMpa: effectiveAllowableStress,
    });

    let thermalStressMpa: number | undefined;
    let combinedStressRatio: number | undefined;

    if (dto.includeStressAnalysis && dto.operatingTempC) {
      const deltaT = Math.abs((dto.operatingTempC || 20) - 20);
      const E = 200000;
      const alpha = 0.012;
      thermalStressMpa = (E * alpha * deltaT) / 1000;

      const pressureStress = dto.workingPressureBar
        ? ((dto.workingPressureBar / 10) * (dto.headerOdMm / 2)) /
          dto.headerWallMm
        : 0;

      const vonMisesStress = Math.sqrt(
        Math.pow(pressureStress, 2) +
          Math.pow(thermalStressMpa, 2) -
          pressureStress * thermalStressMpa,
      );

      combinedStressRatio = vonMisesStress / effectiveAllowableStress;
    }

    return {
      ...baseResult,
      pressureDeratingFactor,
      temperatureDeratingFactor: tempDeratingFactor,
      weldStrengthFactor: weldFactor,
      effectiveAllowableStressMpa:
        Math.round(effectiveAllowableStress * 10) / 10,
      thermalStressMpa: thermalStressMpa
        ? Math.round(thermalStressMpa * 10) / 10
        : undefined,
      combinedStressRatio: combinedStressRatio
        ? Math.round(combinedStressRatio * 100) / 100
        : undefined,
      notes:
        baseResult.notes +
        ` Temp derating: ${(tempDeratingFactor * 100).toFixed(0)}%, Weld factor: ${(weldFactor * 100).toFixed(0)}%`,
    };
  }

  private interpolateTemperatureDerating(tempC: number): number {
    const temps = Object.keys(this.temperatureDeratingFactors)
      .map(Number)
      .sort((a, b) => a - b);

    if (tempC <= temps[0]) return this.temperatureDeratingFactors[temps[0]];
    if (tempC >= temps[temps.length - 1])
      return this.temperatureDeratingFactors[temps[temps.length - 1]];

    let lower = temps[0];
    let upper = temps[temps.length - 1];

    for (let i = 0; i < temps.length - 1; i++) {
      if (tempC >= temps[i] && tempC <= temps[i + 1]) {
        lower = temps[i];
        upper = temps[i + 1];
        break;
      }
    }

    const ratio = (tempC - lower) / (upper - lower);
    return (
      this.temperatureDeratingFactors[lower] +
      ratio *
        (this.temperatureDeratingFactors[upper] -
          this.temperatureDeratingFactors[lower])
    );
  }

  vibrationAnalysis(
    dto: CalculateVibrationAnalysisDto,
  ): VibrationAnalysisResponseDto {
    const od =
      this.nbToOdMap[dto.nominalDiameterMm] || dto.nominalDiameterMm * 1.1;
    const wall = this.estimateWallThickness(
      dto.nominalDiameterMm,
      dto.scheduleNumber,
    );
    const id = od - 2 * wall;

    const I = ((Math.PI / 64) * (Math.pow(od, 4) - Math.pow(id, 4))) / 1e12;
    const E = 200e9;
    const pipeWeight = this.estimatePipeWeightPerMeter(
      dto.nominalDiameterMm,
      dto.scheduleNumber,
      dto.isWaterFilled !== false,
    );

    const insulationWeight = dto.insulationThicknessMm
      ? Math.PI *
        (((od / 1000 + dto.insulationThicknessMm / 1000) *
          dto.insulationThicknessMm) /
          1000) *
        100
      : 0;

    const totalWeightPerM = pipeWeight + insulationWeight;
    const m = totalWeightPerM;
    const L = dto.spanLengthM;

    const configFactors: Record<
      string,
      { fn1: number; fn2: number; fn3: number }
    > = {
      simply_supported: { fn1: 9.87, fn2: 39.48, fn3: 88.83 },
      fixed_fixed: { fn1: 22.37, fn2: 61.67, fn3: 120.9 },
      cantilever: { fn1: 3.52, fn2: 22.03, fn3: 61.7 },
    };

    const factors = configFactors[dto.supportConfig || 'simply_supported'];

    const naturalFrequency =
      (factors.fn1 / (2 * Math.PI)) * Math.sqrt((E * I) / (m * Math.pow(L, 4)));
    const secondMode =
      (factors.fn2 / (2 * Math.PI)) * Math.sqrt((E * I) / (m * Math.pow(L, 4)));
    const thirdMode =
      (factors.fn3 / (2 * Math.PI)) * Math.sqrt((E * I) / (m * Math.pow(L, 4)));

    let resonanceRisk: 'none' | 'low' | 'moderate' | 'high' | 'critical' =
      'none';
    let frequencyRatio: number | undefined;

    if (dto.excitationFrequencyHz) {
      frequencyRatio = dto.excitationFrequencyHz / naturalFrequency;

      if (frequencyRatio > 0.9 && frequencyRatio < 1.1) {
        resonanceRisk = 'critical';
      } else if (frequencyRatio > 0.8 && frequencyRatio < 1.2) {
        resonanceRisk = 'high';
      } else if (frequencyRatio > 0.7 && frequencyRatio < 1.4) {
        resonanceRisk = 'moderate';
      } else if (frequencyRatio > 0.5 && frequencyRatio < 2.0) {
        resonanceRisk = 'low';
      }
    }

    const recommendedMinFreq = dto.excitationFrequencyHz
      ? dto.excitationFrequencyHz * 1.4
      : 8;

    const recommendedMaxSpan = Math.sqrt(
      (factors.fn1 / (2 * Math.PI * recommendedMinFreq)) *
        Math.sqrt((E * I) / m),
    );

    let notes = `Support config: ${dto.supportConfig || 'simply_supported'}. `;
    if (resonanceRisk === 'critical' || resonanceRisk === 'high') {
      notes += `WARNING: High resonance risk at ${(frequencyRatio! * 100).toFixed(0)}% of natural frequency. `;
      notes += `Reduce span to ${recommendedMaxSpan.toFixed(2)}m or add damping. `;
    } else if (naturalFrequency < 4) {
      notes +=
        'Low natural frequency may cause sway. Consider reducing span or adding guides. ';
    } else {
      notes += 'Vibration characteristics acceptable. ';
    }

    return {
      naturalFrequencyHz: Math.round(naturalFrequency * 100) / 100,
      secondModeFrequencyHz: Math.round(secondMode * 100) / 100,
      thirdModeFrequencyHz: Math.round(thirdMode * 100) / 100,
      excitationFrequencyHz: dto.excitationFrequencyHz,
      frequencyRatio: frequencyRatio
        ? Math.round(frequencyRatio * 100) / 100
        : undefined,
      resonanceRisk,
      recommendedMaxSpanM: Math.round(recommendedMaxSpan * 100) / 100,
      minimumSupportFrequencyHz: Math.round(recommendedMinFreq * 10) / 10,
      notes,
    };
  }

  async stressAnalysis(
    dto: CalculateStressAnalysisDto,
  ): Promise<StressAnalysisResponseDto> {
    const bracketDim = await this.bracketDimension(
      dto.bracketTypeCode.toUpperCase(),
      dto.nominalDiameterMm,
    );
    const rodDiameter =
      bracketDim?.rodDiameterMm ||
      this.estimateRodDiameter(dto.nominalDiameterMm);

    const dynamicLoad =
      dto.appliedLoadKg * (dto.dynamicLoadFactor || 1.0) * 9.81;
    const rodArea = (Math.PI / 4) * Math.pow(rodDiameter / 1000, 2);
    const rodTensileStress = dynamicLoad / rodArea / 1e6;

    const yieldStrength = dto.yieldStrengthMpa || 250;
    const tempFactor = this.interpolateTemperatureDerating(
      dto.operatingTempC || 20,
    );
    const effectiveYield = yieldStrength * tempFactor;

    const allowableStress = effectiveYield / 1.5;
    const rodUtilization = (rodTensileStress / allowableStress) * 100;
    const factorOfSafety = allowableStress / rodTensileStress;

    let clampBendingStress: number | undefined;
    let bearingStress: number | undefined;

    if (bracketDim) {
      const thickness = bracketDim.dimensionAMm || 6;
      const width = bracketDim.dimensionBMm || 50;

      const bendingMoment = (dynamicLoad * (width / 1000)) / 4;
      const sectionModulus =
        ((width / 1000) * Math.pow(thickness / 1000, 2)) / 6;
      clampBendingStress = bendingMoment / sectionModulus / 1e6;

      const bearingArea = (thickness / 1000) * (rodDiameter / 1000);
      bearingStress = dynamicLoad / bearingArea / 1e6;
    }

    let status: 'adequate' | 'marginal' | 'inadequate';
    if (factorOfSafety >= 2.0) {
      status = 'adequate';
    } else if (factorOfSafety >= 1.5) {
      status = 'marginal';
    } else {
      status = 'inadequate';
    }

    let notes = `Rod M${rodDiameter} tensile stress: ${rodTensileStress.toFixed(1)} MPa. `;
    if (dto.operatingTempC && dto.operatingTempC > 100) {
      notes += `Temperature derating applied: ${(tempFactor * 100).toFixed(0)}%. `;
    }
    if (status === 'inadequate') {
      notes += 'DESIGN INADEQUATE: Increase rod size or reduce load. ';
    } else if (status === 'marginal') {
      notes += 'Marginal safety factor - consider design review. ';
    }

    return {
      rodTensileStressMpa: Math.round(rodTensileStress * 10) / 10,
      rodStressUtilizationPercent: Math.round(rodUtilization * 10) / 10,
      clampBendingStressMpa: clampBendingStress
        ? Math.round(clampBendingStress * 10) / 10
        : undefined,
      bearingStressMpa: bearingStress
        ? Math.round(bearingStress * 10) / 10
        : undefined,
      factorOfSafety: Math.round(factorOfSafety * 100) / 100,
      isAdequate: status !== 'inadequate',
      status,
      notes,
    };
  }

  private estimateRodDiameter(nbMm: number): number {
    if (nbMm <= 50) return 10;
    if (nbMm <= 100) return 12;
    if (nbMm <= 200) return 16;
    if (nbMm <= 300) return 20;
    if (nbMm <= 450) return 24;
    return 30;
  }

  private readonly materialCompatibilityMatrix: Record<
    MaterialCategoryDto,
    Record<
      PipeMaterialDto,
      {
        compatible: boolean;
        galvanicRisk: 'none' | 'low' | 'moderate' | 'high';
        notes: string;
      }
    >
  > = {
    [MaterialCategoryDto.CARBON_STEEL]: {
      [PipeMaterialDto.CARBON_STEEL]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
      [PipeMaterialDto.STAINLESS_304]: {
        compatible: true,
        galvanicRisk: 'moderate',
        notes: 'Use isolation pads in wet environments',
      },
      [PipeMaterialDto.STAINLESS_316]: {
        compatible: true,
        galvanicRisk: 'moderate',
        notes: 'Use isolation pads in wet environments',
      },
      [PipeMaterialDto.COPPER]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Galvanic corrosion risk - use isolators',
      },
      [PipeMaterialDto.ALUMINUM]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Severe galvanic corrosion - avoid',
      },
      [PipeMaterialDto.CHROME_MOLY]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Compatible with proper surface prep',
      },
      [PipeMaterialDto.CAST_IRON]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Generally compatible',
      },
      [PipeMaterialDto.PVC]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues - check temp limits',
      },
      [PipeMaterialDto.HDPE]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues - check temp limits',
      },
    },
    [MaterialCategoryDto.STAINLESS]: {
      [PipeMaterialDto.CARBON_STEEL]: {
        compatible: true,
        galvanicRisk: 'moderate',
        notes: 'Carbon steel pipe may corrode faster',
      },
      [PipeMaterialDto.STAINLESS_304]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
      [PipeMaterialDto.STAINLESS_316]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
      [PipeMaterialDto.COPPER]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Minor galvanic potential',
      },
      [PipeMaterialDto.ALUMINUM]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Aluminum will corrode - avoid',
      },
      [PipeMaterialDto.CHROME_MOLY]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Generally compatible',
      },
      [PipeMaterialDto.CAST_IRON]: {
        compatible: true,
        galvanicRisk: 'moderate',
        notes: 'Cast iron may corrode',
      },
      [PipeMaterialDto.PVC]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
      [PipeMaterialDto.HDPE]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
    },
    [MaterialCategoryDto.ALLOY]: {
      [PipeMaterialDto.CARBON_STEEL]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Generally compatible',
      },
      [PipeMaterialDto.STAINLESS_304]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Generally compatible',
      },
      [PipeMaterialDto.STAINLESS_316]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Generally compatible',
      },
      [PipeMaterialDto.COPPER]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Check specific alloy',
      },
      [PipeMaterialDto.ALUMINUM]: {
        compatible: false,
        galvanicRisk: 'moderate',
        notes: 'May cause corrosion',
      },
      [PipeMaterialDto.CHROME_MOLY]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent for high-temp',
      },
      [PipeMaterialDto.CAST_IRON]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Compatible',
      },
      [PipeMaterialDto.PVC]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
      [PipeMaterialDto.HDPE]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
    },
    [MaterialCategoryDto.COPPER]: {
      [PipeMaterialDto.CARBON_STEEL]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Steel will corrode - use isolators',
      },
      [PipeMaterialDto.STAINLESS_304]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Minor potential',
      },
      [PipeMaterialDto.STAINLESS_316]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Minor potential',
      },
      [PipeMaterialDto.COPPER]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
      [PipeMaterialDto.ALUMINUM]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Severe - avoid',
      },
      [PipeMaterialDto.CHROME_MOLY]: {
        compatible: true,
        galvanicRisk: 'moderate',
        notes: 'Use isolators',
      },
      [PipeMaterialDto.CAST_IRON]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Cast iron will corrode',
      },
      [PipeMaterialDto.PVC]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
      [PipeMaterialDto.HDPE]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
    },
    [MaterialCategoryDto.ALUMINUM]: {
      [PipeMaterialDto.CARBON_STEEL]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Aluminum will corrode rapidly',
      },
      [PipeMaterialDto.STAINLESS_304]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Aluminum will corrode',
      },
      [PipeMaterialDto.STAINLESS_316]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Aluminum will corrode',
      },
      [PipeMaterialDto.COPPER]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Severe galvanic corrosion',
      },
      [PipeMaterialDto.ALUMINUM]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
      [PipeMaterialDto.CHROME_MOLY]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Avoid this combination',
      },
      [PipeMaterialDto.CAST_IRON]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Aluminum will corrode',
      },
      [PipeMaterialDto.PVC]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
      [PipeMaterialDto.HDPE]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Compatible',
      },
    },
    [MaterialCategoryDto.PLASTIC]: {
      [PipeMaterialDto.CARBON_STEEL]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.STAINLESS_304]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.STAINLESS_316]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.COPPER]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.ALUMINUM]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.CHROME_MOLY]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.CAST_IRON]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.PVC]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
      [PipeMaterialDto.HDPE]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
    },
    [MaterialCategoryDto.CAST_IRON]: {
      [PipeMaterialDto.CARBON_STEEL]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Similar materials',
      },
      [PipeMaterialDto.STAINLESS_304]: {
        compatible: true,
        galvanicRisk: 'moderate',
        notes: 'Cast iron may corrode faster',
      },
      [PipeMaterialDto.STAINLESS_316]: {
        compatible: true,
        galvanicRisk: 'moderate',
        notes: 'Cast iron may corrode faster',
      },
      [PipeMaterialDto.COPPER]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Cast iron will corrode',
      },
      [PipeMaterialDto.ALUMINUM]: {
        compatible: false,
        galvanicRisk: 'high',
        notes: 'Aluminum will corrode',
      },
      [PipeMaterialDto.CHROME_MOLY]: {
        compatible: true,
        galvanicRisk: 'low',
        notes: 'Generally compatible',
      },
      [PipeMaterialDto.CAST_IRON]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'Excellent match',
      },
      [PipeMaterialDto.PVC]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
      [PipeMaterialDto.HDPE]: {
        compatible: true,
        galvanicRisk: 'none',
        notes: 'No galvanic issues',
      },
    },
  };

  private readonly materialTempLimits: Record<
    MaterialCategoryDto,
    { min: number; max: number }
  > = {
    [MaterialCategoryDto.CARBON_STEEL]: { min: -29, max: 425 },
    [MaterialCategoryDto.STAINLESS]: { min: -196, max: 815 },
    [MaterialCategoryDto.ALLOY]: { min: -45, max: 650 },
    [MaterialCategoryDto.COPPER]: { min: -198, max: 205 },
    [MaterialCategoryDto.ALUMINUM]: { min: -269, max: 150 },
    [MaterialCategoryDto.PLASTIC]: { min: -40, max: 60 },
    [MaterialCategoryDto.CAST_IRON]: { min: -29, max: 230 },
  };

  materialCompatibility(
    dto: MaterialCompatibilityCheckDto,
  ): MaterialCompatibilityResponseDto {
    const compat =
      this.materialCompatibilityMatrix[dto.bracketMaterial][dto.pipeMaterial];
    const tempLimits = this.materialTempLimits[dto.bracketMaterial];
    const operatingTemp = dto.operatingTempC || 20;

    const tempCompatible =
      operatingTemp >= tempLimits.min && operatingTemp <= tempLimits.max;

    let rating:
      | 'excellent'
      | 'good'
      | 'acceptable'
      | 'caution'
      | 'not_recommended';
    if (!compat.compatible) {
      rating = 'not_recommended';
    } else if (compat.galvanicRisk === 'none' && tempCompatible) {
      rating = 'excellent';
    } else if (compat.galvanicRisk === 'low' && tempCompatible) {
      rating = 'good';
    } else if (compat.galvanicRisk === 'moderate' || !tempCompatible) {
      rating = 'caution';
    } else {
      rating = 'acceptable';
    }

    const recommendations: string[] = [];

    if (compat.galvanicRisk === 'high' || compat.galvanicRisk === 'moderate') {
      recommendations.push('Use dielectric isolators between pipe and bracket');
      recommendations.push('Apply protective coating to contact surfaces');
    }

    if (dto.isCorrosiveEnvironment) {
      recommendations.push(
        'Consider upgrading bracket material to stainless steel',
      );
      recommendations.push('Apply corrosion-resistant coating');
    }

    if (dto.isOutdoor) {
      recommendations.push('Use hot-dip galvanized or painted brackets');
      recommendations.push('Consider stainless fasteners');
    }

    if (!tempCompatible) {
      recommendations.push(
        `Operating temp ${operatingTemp}°C outside bracket limits (${tempLimits.min}°C to ${tempLimits.max}°C)`,
      );
      recommendations.push(
        'Select bracket material rated for operating temperature',
      );
    }

    const isolationRequired =
      compat.galvanicRisk === 'high' || compat.galvanicRisk === 'moderate'
        ? 'HDPE liner, neoprene pad, or dielectric union required'
        : undefined;

    return {
      isCompatible: compat.compatible && tempCompatible,
      rating,
      galvanicCorrosionRisk: compat.galvanicRisk,
      isolationRequired,
      temperatureCompatible: tempCompatible,
      maxRecommendedTempC: tempLimits.max,
      recommendations,
      notes: compat.notes,
    };
  }

  exportReport(dto: ExportReportDto): ExportReportResponseDto {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = dto.projectName || 'PipeSteelWork';

    let content: string;
    let mimeType: string;
    let filename: string;

    if (dto.format === ExportFormatDto.CSV) {
      content = this.generateCsvReport(dto);
      mimeType = 'text/csv';
      filename = `${projectName}_Report_${timestamp}.csv`;
    } else if (dto.format === ExportFormatDto.EXCEL) {
      content = this.generateExcelXmlReport(dto);
      mimeType = 'application/vnd.ms-excel';
      filename = `${projectName}_Report_${timestamp}.xls`;
    } else {
      content = this.generatePdfHtmlReport(dto);
      mimeType = 'text/html';
      filename = `${projectName}_Report_${timestamp}.html`;
    }

    const base64Content = Buffer.from(content).toString('base64');

    return {
      format: dto.format,
      content: base64Content,
      filename,
      mimeType,
      fileSizeBytes: Buffer.byteLength(content),
    };
  }

  private generateCsvReport(dto: ExportReportDto): string {
    const lines: string[] = [];

    lines.push(
      'Item ID,Work Type,NB (mm),Supports,Weight (kg),Cost (ZAR),Status',
    );

    dto.calculations
      .filter((c) => c.success && c.result)
      .forEach((calc) => {
        const r = calc.result!;
        lines.push(
          [
            calc.itemId,
            r.workType,
            '',
            r.numberOfSupports || '',
            r.totalWeightKg || '',
            r.totalCost || '',
            calc.success ? 'OK' : 'Error',
          ].join(','),
        );
      });

    if (dto.includeWeightSummary || dto.includeCostBreakdown) {
      lines.push('');
      lines.push('SUMMARY');
      const totals = dto.calculations
        .filter((c) => c.success && c.result)
        .reduce(
          (acc, c) => ({
            weight: acc.weight + (c.result?.totalWeightKg || 0),
            cost: acc.cost + (c.result?.totalCost || 0),
            supports: acc.supports + (c.result?.numberOfSupports || 0),
          }),
          { weight: 0, cost: 0, supports: 0 },
        );

      lines.push(`Total Weight (kg),${totals.weight.toFixed(2)}`);
      lines.push(`Total Cost (ZAR),${totals.cost.toFixed(2)}`);
      lines.push(`Total Supports,${totals.supports}`);
    }

    return lines.join('\n');
  }

  private generateExcelXmlReport(dto: ExportReportDto): string {
    const rows = dto.calculations
      .filter((c) => c.success && c.result)
      .map((calc) => {
        const r = calc.result!;
        return `
          <Row>
            <Cell><Data ss:Type="String">${calc.itemId}</Data></Cell>
            <Cell><Data ss:Type="String">${r.workType}</Data></Cell>
            <Cell><Data ss:Type="Number">${r.numberOfSupports || 0}</Data></Cell>
            <Cell><Data ss:Type="Number">${r.totalWeightKg || 0}</Data></Cell>
            <Cell><Data ss:Type="Number">${r.totalCost || 0}</Data></Cell>
          </Row>`;
      })
      .join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Pipe Steel Work">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Item ID</Data></Cell>
        <Cell><Data ss:Type="String">Work Type</Data></Cell>
        <Cell><Data ss:Type="String">Supports</Data></Cell>
        <Cell><Data ss:Type="String">Weight (kg)</Data></Cell>
        <Cell><Data ss:Type="String">Cost (ZAR)</Data></Cell>
      </Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;
  }

  private generatePdfHtmlReport(dto: ExportReportDto): string {
    const totals = dto.calculations
      .filter((c) => c.success && c.result)
      .reduce(
        (acc, c) => ({
          weight: acc.weight + (c.result?.totalWeightKg || 0),
          cost: acc.cost + (c.result?.totalCost || 0),
          supports: acc.supports + (c.result?.numberOfSupports || 0),
        }),
        { weight: 0, cost: 0, supports: 0 },
      );

    const rows = dto.calculations
      .filter((c) => c.success && c.result)
      .map((calc) => {
        const r = calc.result!;
        return `
          <tr>
            <td>${calc.itemId}</td>
            <td>${r.workType}</td>
            <td>${r.numberOfSupports || '-'}</td>
            <td>${r.totalWeightKg?.toFixed(2) || '-'}</td>
            <td>R ${r.totalCost?.toFixed(2) || '-'}</td>
          </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <title>Pipe Steel Work Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4472c4; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .summary { margin-top: 30px; padding: 15px; background: #f5f5f5; }
    .header-info { margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Pipe Steel Work Calculation Report</h1>
  <div class="header-info">
    <p><strong>Project:</strong> ${dto.projectName || 'N/A'}</p>
    <p><strong>Project No:</strong> ${dto.projectNumber || 'N/A'}</p>
    <p><strong>Client:</strong> ${dto.clientName || 'N/A'}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item ID</th>
        <th>Work Type</th>
        <th>Supports</th>
        <th>Weight (kg)</th>
        <th>Cost (ZAR)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="summary">
    <h3>Summary</h3>
    <p><strong>Total Items:</strong> ${dto.calculations.length}</p>
    <p><strong>Total Supports:</strong> ${totals.supports}</p>
    <p><strong>Total Weight:</strong> ${totals.weight.toFixed(2)} kg</p>
    <p><strong>Total Cost:</strong> R ${totals.cost.toFixed(2)}</p>
  </div>
</body>
</html>`;
  }

  private readonly standardPlateSizesData: StandardPlateSizeDto[] = [
    {
      id: 'plate-100x100x5',
      name: '100 x 100 x 5mm',
      lengthMm: 100,
      widthMm: 100,
      thicknessMm: 5,
      category: PlateSizeCategory.SMALL,
      weightKg: 0.39,
      commonUses: 'Small brackets, light supports',
    },
    {
      id: 'plate-100x100x8',
      name: '100 x 100 x 8mm',
      lengthMm: 100,
      widthMm: 100,
      thicknessMm: 8,
      category: PlateSizeCategory.SMALL,
      weightKg: 0.63,
      commonUses: 'Small brackets, light supports',
    },
    {
      id: 'plate-100x100x10',
      name: '100 x 100 x 10mm',
      lengthMm: 100,
      widthMm: 100,
      thicknessMm: 10,
      category: PlateSizeCategory.SMALL,
      weightKg: 0.79,
      commonUses: 'Small brackets, medium supports',
    },
    {
      id: 'plate-150x150x8',
      name: '150 x 150 x 8mm',
      lengthMm: 150,
      widthMm: 150,
      thicknessMm: 8,
      category: PlateSizeCategory.SMALL,
      weightKg: 1.41,
      commonUses: 'Medium brackets, pipe clamps',
    },
    {
      id: 'plate-150x150x10',
      name: '150 x 150 x 10mm',
      lengthMm: 150,
      widthMm: 150,
      thicknessMm: 10,
      category: PlateSizeCategory.SMALL,
      weightKg: 1.77,
      commonUses: 'Medium brackets, pipe clamps',
    },
    {
      id: 'plate-150x150x12',
      name: '150 x 150 x 12mm',
      lengthMm: 150,
      widthMm: 150,
      thicknessMm: 12,
      category: PlateSizeCategory.SMALL,
      weightKg: 2.12,
      commonUses: 'Medium brackets, pipe clamps',
    },
    {
      id: 'plate-200x200x10',
      name: '200 x 200 x 10mm',
      lengthMm: 200,
      widthMm: 200,
      thicknessMm: 10,
      category: PlateSizeCategory.MEDIUM,
      weightKg: 3.14,
      commonUses: 'Standard base plates',
    },
    {
      id: 'plate-200x200x12',
      name: '200 x 200 x 12mm',
      lengthMm: 200,
      widthMm: 200,
      thicknessMm: 12,
      category: PlateSizeCategory.MEDIUM,
      weightKg: 3.77,
      commonUses: 'Standard base plates',
    },
    {
      id: 'plate-200x200x15',
      name: '200 x 200 x 15mm',
      lengthMm: 200,
      widthMm: 200,
      thicknessMm: 15,
      category: PlateSizeCategory.MEDIUM,
      weightKg: 4.71,
      commonUses: 'Heavy base plates',
    },
    {
      id: 'plate-250x250x12',
      name: '250 x 250 x 12mm',
      lengthMm: 250,
      widthMm: 250,
      thicknessMm: 12,
      category: PlateSizeCategory.MEDIUM,
      weightKg: 5.89,
      commonUses: 'Large base plates',
    },
    {
      id: 'plate-250x250x15',
      name: '250 x 250 x 15mm',
      lengthMm: 250,
      widthMm: 250,
      thicknessMm: 15,
      category: PlateSizeCategory.MEDIUM,
      weightKg: 7.36,
      commonUses: 'Large base plates',
    },
    {
      id: 'plate-250x250x20',
      name: '250 x 250 x 20mm',
      lengthMm: 250,
      widthMm: 250,
      thicknessMm: 20,
      category: PlateSizeCategory.MEDIUM,
      weightKg: 9.81,
      commonUses: 'Heavy duty supports',
    },
    {
      id: 'plate-300x300x15',
      name: '300 x 300 x 15mm',
      lengthMm: 300,
      widthMm: 300,
      thicknessMm: 15,
      category: PlateSizeCategory.LARGE,
      weightKg: 10.6,
      commonUses: 'Large supports, anchors',
    },
    {
      id: 'plate-300x300x20',
      name: '300 x 300 x 20mm',
      lengthMm: 300,
      widthMm: 300,
      thicknessMm: 20,
      category: PlateSizeCategory.LARGE,
      weightKg: 14.13,
      commonUses: 'Large supports, anchors',
    },
    {
      id: 'plate-300x300x25',
      name: '300 x 300 x 25mm',
      lengthMm: 300,
      widthMm: 300,
      thicknessMm: 25,
      category: PlateSizeCategory.LARGE,
      weightKg: 17.66,
      commonUses: 'Heavy anchors',
    },
    {
      id: 'plate-400x400x20',
      name: '400 x 400 x 20mm',
      lengthMm: 400,
      widthMm: 400,
      thicknessMm: 20,
      category: PlateSizeCategory.LARGE,
      weightKg: 25.12,
      commonUses: 'Large equipment supports',
    },
    {
      id: 'plate-400x400x25',
      name: '400 x 400 x 25mm',
      lengthMm: 400,
      widthMm: 400,
      thicknessMm: 25,
      category: PlateSizeCategory.LARGE,
      weightKg: 31.4,
      commonUses: 'Large equipment supports',
    },
    {
      id: 'plate-500x500x20',
      name: '500 x 500 x 20mm',
      lengthMm: 500,
      widthMm: 500,
      thicknessMm: 20,
      category: PlateSizeCategory.LARGE,
      weightKg: 39.25,
      commonUses: 'Major equipment bases',
    },
    {
      id: 'plate-500x500x25',
      name: '500 x 500 x 25mm',
      lengthMm: 500,
      widthMm: 500,
      thicknessMm: 25,
      category: PlateSizeCategory.LARGE,
      weightKg: 49.06,
      commonUses: 'Major equipment bases',
    },
    {
      id: 'plate-500x500x30',
      name: '500 x 500 x 30mm',
      lengthMm: 500,
      widthMm: 500,
      thicknessMm: 30,
      category: PlateSizeCategory.LARGE,
      weightKg: 58.88,
      commonUses: 'Heavy equipment foundations',
    },
  ];

  standardPlateSizes(category?: string): StandardPlateSizeDto[] {
    if (category) {
      return this.standardPlateSizesData.filter((p) => p.category === category);
    }
    return this.standardPlateSizesData;
  }

  private readonly gasketMaterialsData: GasketMaterialDto[] = [
    {
      code: 'SW-304-GRAPH',
      name: 'Spiral Wound 304SS/Graphite',
      type: GasketMaterialType.SPIRAL_WOUND,
      minTempC: -200,
      maxTempC: 450,
      maxPressureBar: 250,
      compatibleFlanges: ['RF', 'RTJ'],
      compatibleServices: [
        'Steam',
        'Hydrocarbons',
        'Chemicals',
        'Water',
        'Air',
      ],
      incompatibleServices: ['Strong acids', 'Fluorine'],
      costFactor: 1.5,
      notes:
        'General purpose, excellent recovery. Inner ring recommended for vacuum service.',
    },
    {
      code: 'SW-316-GRAPH',
      name: 'Spiral Wound 316SS/Graphite',
      type: GasketMaterialType.SPIRAL_WOUND,
      minTempC: -200,
      maxTempC: 450,
      maxPressureBar: 250,
      compatibleFlanges: ['RF', 'RTJ'],
      compatibleServices: [
        'Steam',
        'Hydrocarbons',
        'Chemicals',
        'Seawater',
        'Acids',
      ],
      incompatibleServices: ['Chlorides at high temp'],
      costFactor: 1.8,
      notes: 'Better corrosion resistance than 304SS.',
    },
    {
      code: 'SW-304-PTFE',
      name: 'Spiral Wound 304SS/PTFE',
      type: GasketMaterialType.SPIRAL_WOUND,
      minTempC: -200,
      maxTempC: 260,
      maxPressureBar: 150,
      compatibleFlanges: ['RF'],
      compatibleServices: [
        'Acids',
        'Alkalis',
        'Solvents',
        'Food grade',
        'Pharmaceuticals',
      ],
      costFactor: 2.0,
      notes: 'Excellent chemical resistance. Not suitable for high temp steam.',
    },
    {
      code: 'RTJ-SOFT-IRON',
      name: 'Ring Joint - Soft Iron',
      type: GasketMaterialType.RING_JOINT,
      minTempC: -29,
      maxTempC: 450,
      maxPressureBar: 690,
      compatibleFlanges: ['RTJ'],
      compatibleServices: ['High pressure steam', 'Hydrocarbons', 'Gas'],
      incompatibleServices: ['Corrosive chemicals'],
      costFactor: 2.5,
      notes:
        'Metal-to-metal seal. For Class 600+ and high pressure applications.',
    },
    {
      code: 'RTJ-304SS',
      name: 'Ring Joint - 304SS',
      type: GasketMaterialType.RING_JOINT,
      minTempC: -196,
      maxTempC: 540,
      maxPressureBar: 690,
      compatibleFlanges: ['RTJ'],
      compatibleServices: ['High pressure', 'Cryogenic', 'Corrosive services'],
      costFactor: 3.0,
      notes: 'Metal-to-metal seal with corrosion resistance.',
    },
    {
      code: 'PTFE-SHEET',
      name: 'PTFE Sheet (Virgin)',
      type: GasketMaterialType.PTFE,
      minTempC: -200,
      maxTempC: 260,
      maxPressureBar: 40,
      compatibleFlanges: ['FF', 'RF'],
      compatibleServices: ['Acids', 'Alkalis', 'Solvents', 'Food', 'Pharma'],
      incompatibleServices: ['Molten alkali metals'],
      costFactor: 1.2,
      notes: 'Excellent chemical resistance. Subject to cold flow.',
    },
    {
      code: 'PTFE-ENV',
      name: 'PTFE Envelope with Filler',
      type: GasketMaterialType.PTFE,
      minTempC: -200,
      maxTempC: 230,
      maxPressureBar: 60,
      compatibleFlanges: ['FF', 'RF'],
      compatibleServices: ['Corrosive chemicals', 'Food', 'Pharma'],
      costFactor: 1.4,
      notes: 'Better compression than virgin PTFE.',
    },
    {
      code: 'GRAPHITE-FLEX',
      name: 'Flexible Graphite Sheet',
      type: GasketMaterialType.GRAPHITE,
      minTempC: -200,
      maxTempC: 650,
      maxPressureBar: 200,
      compatibleFlanges: ['RF', 'FF'],
      compatibleServices: [
        'Steam',
        'Hydrocarbons',
        'Chemicals',
        'High temperature',
      ],
      incompatibleServices: ['Strong oxidizers'],
      costFactor: 1.3,
      notes: 'Excellent high temp performance. SS insert recommended.',
    },
    {
      code: 'CAF-STANDARD',
      name: 'Compressed Non-Asbestos Fibre',
      type: GasketMaterialType.CAF,
      minTempC: -40,
      maxTempC: 200,
      maxPressureBar: 40,
      compatibleFlanges: ['FF', 'RF'],
      compatibleServices: ['Water', 'Air', 'Low pressure steam', 'Oil'],
      costFactor: 0.8,
      notes:
        'General utility gasket. Economical choice for non-critical service.',
    },
    {
      code: 'RUBBER-EPDM',
      name: 'EPDM Rubber',
      type: GasketMaterialType.RUBBER,
      minTempC: -40,
      maxTempC: 120,
      maxPressureBar: 16,
      compatibleFlanges: ['FF'],
      compatibleServices: [
        'Water',
        'Steam (low temp)',
        'Dilute acids',
        'Alkalis',
      ],
      incompatibleServices: ['Oils', 'Hydrocarbons'],
      costFactor: 0.6,
      notes: 'Good for water systems. Not oil resistant.',
    },
    {
      code: 'RUBBER-NBR',
      name: 'Nitrile Rubber (NBR)',
      type: GasketMaterialType.RUBBER,
      minTempC: -30,
      maxTempC: 100,
      maxPressureBar: 16,
      compatibleFlanges: ['FF'],
      compatibleServices: ['Oils', 'Fuels', 'Hydraulic fluids'],
      incompatibleServices: ['Ketones', 'Chlorinated solvents'],
      costFactor: 0.7,
      notes: 'Good oil resistance. Standard for petroleum services.',
    },
  ];

  gasketMaterials(type?: string): GasketMaterialDto[] {
    if (type) {
      return this.gasketMaterialsData.filter((g) => g.type === type);
    }
    return this.gasketMaterialsData;
  }

  gasketCompatibility(
    dto: GasketCompatibilityCheckDto,
  ): GasketCompatibilityResponseDto {
    const gasket = this.gasketMaterialsData.find(
      (g) => g.code === dto.gasketCode,
    );

    if (!gasket) {
      return {
        isCompatible: false,
        score: 0,
        warnings: ['Unknown gasket material code'],
        recommendations: ['Select a valid gasket material'],
      };
    }

    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (dto.designTempC < gasket.minTempC) {
      warnings.push(
        `Temperature ${dto.designTempC}°C below minimum ${gasket.minTempC}°C`,
      );
      score -= 40;
    }
    if (dto.designTempC > gasket.maxTempC) {
      warnings.push(
        `Temperature ${dto.designTempC}°C exceeds maximum ${gasket.maxTempC}°C`,
      );
      score -= 40;
    }

    if (dto.designPressureBar > gasket.maxPressureBar) {
      warnings.push(
        `Pressure ${dto.designPressureBar} bar exceeds maximum ${gasket.maxPressureBar} bar`,
      );
      score -= 40;
    }

    if (dto.flangeFace && !gasket.compatibleFlanges.includes(dto.flangeFace)) {
      warnings.push(`Not recommended for ${dto.flangeFace} flange face`);
      score -= 20;
      recommendations.push(
        `Use flange face type: ${gasket.compatibleFlanges.join(' or ')}`,
      );
    }

    const serviceFluidLower = dto.serviceFluid.toLowerCase();
    const isIncompatible = gasket.incompatibleServices?.some((s) =>
      serviceFluidLower.includes(s.toLowerCase()),
    );
    if (isIncompatible) {
      warnings.push(`Service fluid "${dto.serviceFluid}" may be incompatible`);
      score -= 30;
    }

    const isCompatibleService = gasket.compatibleServices.some(
      (s) =>
        serviceFluidLower.includes(s.toLowerCase()) ||
        s.toLowerCase().includes(serviceFluidLower),
    );
    if (isCompatibleService) {
      score += 10;
    }

    score = Math.max(0, Math.min(100, score));

    const alternatives: string[] = [];
    if (score < 70) {
      this.gasketMaterialsData
        .filter(
          (g) =>
            g.code !== dto.gasketCode &&
            g.minTempC <= dto.designTempC &&
            g.maxTempC >= dto.designTempC &&
            g.maxPressureBar >= dto.designPressureBar,
        )
        .slice(0, 3)
        .forEach((g) => alternatives.push(`${g.name} (${g.code})`));

      if (alternatives.length > 0) {
        recommendations.push('Consider alternative gasket materials');
      }
    }

    return {
      isCompatible: score >= 60,
      score,
      warnings,
      recommendations,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  }

  private readonly heatTreatmentsData: HeatTreatmentDto[] = [
    {
      code: 'PWHT-CS',
      name: 'Post Weld Heat Treatment (Carbon Steel)',
      type: HeatTreatmentType.PWHT,
      description:
        'Stress relief heat treatment for carbon steel welds per ASME B31.3',
      tempRangeLowC: 595,
      tempRangeHighC: 650,
      holdTimeFormula: '1 hour per 25mm thickness, minimum 1 hour',
      heatingRateMaxCPerHr: 220,
      coolingRateMaxCPerHr: 280,
      applicableMaterials: ['A106', 'A105', 'A234', 'A53', 'Carbon Steel'],
      codeReferences: ['ASME B31.3 §331.1.1', 'ASME VIII Div 1 UCS-56'],
      baseCostPerKg: 15,
      notes: 'Required for wall thickness > 19mm in most applications',
    },
    {
      code: 'PWHT-LACS',
      name: 'PWHT (Low Alloy Chrome-Moly)',
      type: HeatTreatmentType.PWHT,
      description: 'Stress relief for P11/P22 chrome-moly steels',
      tempRangeLowC: 675,
      tempRangeHighC: 730,
      holdTimeFormula: '1 hour per 25mm, minimum 2 hours',
      heatingRateMaxCPerHr: 165,
      coolingRateMaxCPerHr: 165,
      applicableMaterials: ['P11', 'P22', 'A335', '1.25Cr-0.5Mo', '2.25Cr-1Mo'],
      codeReferences: ['ASME B31.3 §331.1.3', 'AWS D10.8'],
      baseCostPerKg: 25,
      notes: 'Critical for preventing hydrogen attack and stress corrosion',
    },
    {
      code: 'STRESS-RELIEF',
      name: 'Stress Relief Anneal',
      type: HeatTreatmentType.STRESS_RELIEF,
      description:
        'Lower temperature stress relief without metallurgical changes',
      tempRangeLowC: 550,
      tempRangeHighC: 595,
      holdTimeFormula: '1 hour per 25mm, minimum 30 minutes',
      heatingRateMaxCPerHr: 280,
      coolingRateMaxCPerHr: 280,
      applicableMaterials: ['Carbon Steel', 'Low Alloy Steel'],
      codeReferences: ['ASME B31.3 §331.2'],
      baseCostPerKg: 12,
      notes: 'Alternative to full PWHT where permitted',
    },
    {
      code: 'NORMALIZE',
      name: 'Normalizing',
      type: HeatTreatmentType.NORMALIZING,
      description: 'Heat above transformation temperature, air cool',
      tempRangeLowC: 870,
      tempRangeHighC: 930,
      holdTimeFormula: '1 hour per 25mm, minimum 1 hour',
      heatingRateMaxCPerHr: 220,
      coolingRateMaxCPerHr: 0,
      applicableMaterials: ['Carbon Steel', 'Low Alloy Steel'],
      codeReferences: ['ASTM A941', 'ASME SA-20'],
      baseCostPerKg: 18,
      notes: 'Air cooling. Refines grain structure.',
    },
    {
      code: 'SOLUTION-SS',
      name: 'Solution Annealing (Stainless)',
      type: HeatTreatmentType.SOLUTION_ANNEALING,
      description: 'Dissolve carbides and restore corrosion resistance',
      tempRangeLowC: 1010,
      tempRangeHighC: 1120,
      holdTimeFormula: 'Based on section thickness, typically 1hr/25mm',
      heatingRateMaxCPerHr: 0,
      coolingRateMaxCPerHr: 0,
      applicableMaterials: ['304', '304L', '316', '316L', 'Stainless Steel'],
      codeReferences: ['ASTM A380', 'ASME SA-479'],
      baseCostPerKg: 35,
      notes: 'Rapid water quench required. Essential after welding 304H/316H.',
    },
    {
      code: 'SOLUTION-DUPLEX',
      name: 'Solution Annealing (Duplex)',
      type: HeatTreatmentType.SOLUTION_ANNEALING,
      description: 'Restore austenite/ferrite balance in duplex stainless',
      tempRangeLowC: 1020,
      tempRangeHighC: 1100,
      holdTimeFormula: 'Minimum 5 minutes at temperature',
      heatingRateMaxCPerHr: 0,
      coolingRateMaxCPerHr: 0,
      applicableMaterials: ['2205', '2507', 'Duplex', 'Super Duplex'],
      codeReferences: ['ASTM A928', 'NORSOK M-601'],
      baseCostPerKg: 45,
      notes:
        'Rapid water quench essential. Critical for maintaining phase balance.',
    },
  ];

  heatTreatments(): HeatTreatmentDto[] {
    return this.heatTreatmentsData;
  }

  private readonly pwhtThresholds: Record<
    string,
    { wallThicknessMm: number; pNumber: string }
  > = {
    'Carbon Steel': { wallThicknessMm: 19, pNumber: '1' },
    A106: { wallThicknessMm: 19, pNumber: '1' },
    A105: { wallThicknessMm: 19, pNumber: '1' },
    A53: { wallThicknessMm: 19, pNumber: '1' },
    P11: { wallThicknessMm: 13, pNumber: '4' },
    P22: { wallThicknessMm: 13, pNumber: '5A' },
    '1.25Cr-0.5Mo': { wallThicknessMm: 13, pNumber: '4' },
    '2.25Cr-1Mo': { wallThicknessMm: 13, pNumber: '5A' },
    '304': { wallThicknessMm: 0, pNumber: '8' },
    '316': { wallThicknessMm: 0, pNumber: '8' },
    '304L': { wallThicknessMm: 0, pNumber: '8' },
    '316L': { wallThicknessMm: 0, pNumber: '8' },
    '2205': { wallThicknessMm: 0, pNumber: '10H' },
    Duplex: { wallThicknessMm: 0, pNumber: '10H' },
  };

  heatTreatmentRequirement(
    dto: HeatTreatmentRequirementDto,
  ): HeatTreatmentRequirementResponseDto {
    const materialUpper = dto.material.toUpperCase();
    const threshold = Object.entries(this.pwhtThresholds).find(([key]) =>
      materialUpper.includes(key.toUpperCase()),
    );

    if (
      materialUpper.includes('304') ||
      materialUpper.includes('316') ||
      materialUpper.includes('STAINLESS')
    ) {
      const treatment = this.heatTreatmentsData.find(
        (t) => t.code === 'SOLUTION-SS',
      )!;
      const isRequired =
        dto.wallThicknessMm > 6 &&
        (dto.weldType === 'multipass' || dto.weldType === 'full_penetration');

      return {
        isRequired,
        requiredTreatment: isRequired
          ? HeatTreatmentType.SOLUTION_ANNEALING
          : null,
        treatment: isRequired ? treatment : null,
        reason: isRequired
          ? 'Solution annealing may be required to restore corrosion resistance after welding'
          : 'Solution annealing typically not required for L-grade austenitic stainless with proper weld procedures',
        estimatedCostImpact: isRequired
          ? Math.round(dto.wallThicknessMm * 10 * treatment.baseCostPerKg!)
          : 0,
        codeReferences: ['ASME B31.3 §331.1.4', 'NACE MR0175'],
        exemptionConditions: isRequired
          ? undefined
          : [
              'L-grade material (304L, 316L)',
              'Low heat input welding',
              'Non-sensitizing service conditions',
            ],
      };
    }

    if (
      materialUpper.includes('DUPLEX') ||
      materialUpper.includes('2205') ||
      materialUpper.includes('2507')
    ) {
      const treatment = this.heatTreatmentsData.find(
        (t) => t.code === 'SOLUTION-DUPLEX',
      )!;

      return {
        isRequired: true,
        requiredTreatment: HeatTreatmentType.SOLUTION_ANNEALING,
        treatment,
        reason:
          'Solution annealing required for duplex stainless to maintain phase balance after welding',
        estimatedCostImpact: Math.round(
          dto.wallThicknessMm * 10 * treatment.baseCostPerKg!,
        ),
        codeReferences: ['ASME B31.3 §331.1.4', 'NORSOK M-601', 'API RP 938-C'],
      };
    }

    if (
      materialUpper.includes('P11') ||
      materialUpper.includes('P22') ||
      materialUpper.includes('CR-MO') ||
      materialUpper.includes('CHROME')
    ) {
      const treatment = this.heatTreatmentsData.find(
        (t) => t.code === 'PWHT-LACS',
      )!;
      const thresholdMm = 13;
      const isRequired = dto.wallThicknessMm > thresholdMm;

      return {
        isRequired,
        requiredTreatment: isRequired ? HeatTreatmentType.PWHT : null,
        treatment: isRequired ? treatment : null,
        reason: isRequired
          ? `Wall thickness ${dto.wallThicknessMm}mm exceeds ${thresholdMm}mm threshold for Cr-Mo materials`
          : `Wall thickness ${dto.wallThicknessMm}mm below ${thresholdMm}mm threshold`,
        estimatedCostImpact: isRequired
          ? Math.round(dto.wallThicknessMm * 10 * treatment.baseCostPerKg!)
          : 0,
        codeReferences: ['ASME B31.3 §331.1.3', 'AWS D10.8'],
        exemptionConditions: isRequired
          ? undefined
          : [`Thickness ≤ ${thresholdMm}mm`, 'Preheat maintained per WPS'],
      };
    }

    const treatment = this.heatTreatmentsData.find(
      (t) => t.code === 'PWHT-CS',
    )!;
    const thresholdMm = threshold?.[1]?.wallThicknessMm || 19;
    const isRequired = dto.wallThicknessMm > thresholdMm;

    return {
      isRequired,
      requiredTreatment: isRequired ? HeatTreatmentType.PWHT : null,
      treatment: isRequired ? treatment : null,
      reason: isRequired
        ? `Wall thickness ${dto.wallThicknessMm}mm exceeds ${thresholdMm}mm threshold for carbon steel`
        : `Wall thickness ${dto.wallThicknessMm}mm below ${thresholdMm}mm threshold`,
      estimatedCostImpact: isRequired
        ? Math.round(dto.wallThicknessMm * 10 * treatment.baseCostPerKg!)
        : 0,
      codeReferences: ['ASME B31.3 §331.1.1', 'ASME VIII Div 1 UCS-56'],
      exemptionConditions: isRequired
        ? undefined
        : [
            `Thickness ≤ ${thresholdMm}mm`,
            'Design temperature > -29°C',
            'Non-lethal service (non-toxic, non-flammable)',
            'Carbon equivalent ≤ 0.50%',
          ],
    };
  }
}
