import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipeSupportSpacing } from './entities/pipe-support-spacing.entity';
import { BracketTypeEntity } from './entities/bracket-type.entity';
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
} from './dto/pipe-steel-work.dto';

@Injectable()
export class PipeSteelWorkService {
  private readonly STEEL_DENSITY_KG_M3 = 7850;

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

  constructor(
    @InjectRepository(PipeSupportSpacing)
    private readonly supportSpacingRepository: Repository<PipeSupportSpacing>,
    @InjectRepository(BracketTypeEntity)
    private readonly bracketTypeRepository: Repository<BracketTypeEntity>,
  ) {}

  supportSpacing(
    dto: CalculateSupportSpacingDto,
  ): SupportSpacingResponseDto {
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
    const { headerOdMm, headerWallMm, branchOdMm, branchWallMm } = dto;

    const headerRm = headerOdMm / 2;
    const branchRb = branchOdMm / 2;

    const d1 = branchOdMm - 2 * branchWallMm;
    const d2 = Math.min(d1, headerRm - headerWallMm);

    const A1 = headerWallMm * d1;
    const A2 = 2 * d2 * (branchWallMm - 0);
    const A3 = 0;

    const requiredArea = d1 * headerWallMm;
    const availableArea = A1 + A2 + A3;
    const areaDeficit = requiredArea - availableArea;

    const reinforcementRequired = areaDeficit > 0;

    let padOuterDiameter = 0;
    let padThickness = 0;
    let padWeight = 0;

    if (reinforcementRequired) {
      padThickness = Math.max(headerWallMm, Math.ceil(areaDeficit / (2 * d2)));
      padThickness = Math.ceil(padThickness / 2) * 2;

      padOuterDiameter = branchOdMm + 2 * d2 + 50;
      padOuterDiameter = Math.ceil(padOuterDiameter / 10) * 10;

      const padInnerDiameter = branchOdMm + 3;
      const padArea =
        (Math.PI / 4) *
        (Math.pow(padOuterDiameter, 2) - Math.pow(padInnerDiameter, 2));
      const padVolume = (padArea * padThickness) / 1e9;
      padWeight = padVolume * this.STEEL_DENSITY_KG_M3;
    }

    return {
      requiredAreaMm2: Math.round(requiredArea),
      padOuterDiameterMm: padOuterDiameter,
      padThicknessMm: padThickness,
      padWeightKg: Math.round(padWeight * 100) / 100,
      reinforcementRequired,
      notes: reinforcementRequired
        ? `Reinforcement pad required per ASME B31.3 §304.3.3. Area deficit: ${Math.round(areaDeficit)} mm²`
        : 'No reinforcement required - available area exceeds required area',
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
      response.unitCost =
        Math.round(padResult.padWeightKg * steelPricePerKg * fabricationFactor);
      response.totalCost = response.unitCost * (dto.quantity || 1);

      response.notes = padResult.notes;
    }

    return response;
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

  private interpolateSpacing(
    diameterMm: number,
  ): { water: number; vapor: number; rod: number } {
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
      water: Math.round(
        (lowerSpacing.water + ratio * (upperSpacing.water - lowerSpacing.water)) *
          10,
      ) / 10,
      vapor: Math.round(
        (lowerSpacing.vapor + ratio * (upperSpacing.vapor - lowerSpacing.vapor)) *
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
        400: 12.70,
        500: 12.70,
        600: 14.27,
      },
    };

    const closestNb = this.findClosestNb(nominalDiameterMm);
    const scheduleData = scheduleWalls[schedule || 'Std'] || scheduleWalls['Std'];

    return scheduleData[closestNb] || 6.0;
  }
}
