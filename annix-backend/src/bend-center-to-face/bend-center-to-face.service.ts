import { Injectable, NotFoundException } from "@nestjs/common";
import { FlangeTypeWeightService } from "../flange-type-weight/flange-type-weight.service";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { BendCenterToFaceRepository } from "./bend-center-to-face.repository";
import { BendCenterToFace } from "./entities/bend-center-to-face.entity";

@Injectable()
export class BendCenterToFaceService {
  constructor(
    private readonly bendCenterToFaceRepository: BendCenterToFaceRepository,
    private readonly flangeTypeWeightService: FlangeTypeWeightService,
  ) {}

  async findAll(): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceRepository.findAllOrdered();
  }

  async findByBendType(bendType: string): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceRepository.findByBendType(bendType);
  }

  async findByNominalBore(nominalBoreMm: number): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceRepository.findByNominalBore(nominalBoreMm);
  }

  async findByCriteria(
    bendType: string,
    nominalBoreMm: number,
    degrees: number,
  ): Promise<BendCenterToFace | null> {
    return this.bendCenterToFaceRepository.findByCriteria(bendType, nominalBoreMm, degrees);
  }

  async findNearestBendDimension(
    bendType: string,
    nominalBoreMm: number,
    targetDegrees: number,
  ): Promise<BendCenterToFace | null> {
    const availableBends =
      await this.bendCenterToFaceRepository.findByBendTypeAndNominalBoreOrdered(
        bendType,
        nominalBoreMm,
      );

    if (availableBends.length === 0) return null;

    let closest = availableBends[0];
    let minDiff = Math.abs(Number(closest.degrees) - targetDegrees);

    for (const bend of availableBends) {
      const diff = Math.abs(Number(bend.degrees) - targetDegrees);
      if (diff < minDiff) {
        minDiff = diff;
        closest = bend;
      }
    }

    return closest;
  }

  async getBendTypes(): Promise<string[]> {
    return this.bendCenterToFaceRepository.distinctBendTypes();
  }

  async getNominalBoresForBendType(bendType: string): Promise<number[]> {
    return this.bendCenterToFaceRepository.distinctNominalBoresForBendType(bendType);
  }

  async getDegreesForBendType(bendType: string, nominalBoreMm?: number): Promise<number[]> {
    return this.bendCenterToFaceRepository.distinctDegreesForBendType(bendType, nominalBoreMm);
  }

  async getOptionsForBendType(
    bendType: string,
  ): Promise<{ nominalBores: number[]; degrees: number[] }> {
    const nominalBores = await this.getNominalBoresForBendType(bendType);
    const degrees = await this.getDegreesForBendType(bendType);

    return { nominalBores, degrees };
  }

  async calculateBendSpecifications(params: {
    nominalBoreMm: number;
    wallThicknessMm: number;
    scheduleNumber?: string;
    bendType: string;
    bendDegrees: number;
    bendStyle?: "pulled" | "segmented";
    numberOfTangents?: number;
    tangentLengths?: number[];
    quantity?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
  }) {
    const {
      nominalBoreMm,
      wallThicknessMm,
      bendType,
      bendDegrees,
      bendStyle = "pulled",
      numberOfTangents = 0,
      tangentLengths = [],
      quantity = 1,
      flangeStandardId,
      flangePressureClassId,
    } = params;

    const bendData = await this.findNearestBendDimension(bendType, nominalBoreMm, bendDegrees);
    if (!bendData) {
      throw new NotFoundException(
        `No bend data found for ${bendType} ${nominalBoreMm}mm at ${bendDegrees}°`,
      );
    }

    const pipeDimension = await this.bendCenterToFaceRepository.findPipeDimension(
      nominalBoreMm,
      wallThicknessMm,
    );

    if (!pipeDimension) {
      throw new NotFoundException(
        `No pipe dimension found for ${nominalBoreMm}mm NB with ${wallThicknessMm}mm wall thickness`,
      );
    }

    const pipeOdMm = pipeDimension.nominalOutsideDiameter?.nominal_diameter_mm || nominalBoreMm;
    const bendWeight = this.calculateBendWeight(bendData, pipeDimension, bendStyle, pipeOdMm);
    const tangentWeight = this.calculateTangentWeight(tangentLengths, pipeDimension);

    let flangeWeight = 0;
    let numberOfFlanges = 0;
    let numberOfFlangeWelds = 0;
    let totalFlangeWeldLength = 0;

    if (flangeStandardId && flangePressureClassId) {
      numberOfFlanges = this.calculateFlangeCount(numberOfTangents);

      if (numberOfFlanges > 0) {
        const flangeDimension = await this.bendCenterToFaceRepository.findFlangeDimension(
          nominalBoreMm,
          flangeStandardId,
          flangePressureClassId,
        );

        if (flangeDimension) {
          // Prefer the per-type weight table; fall back to the type-ambiguous
          // flange_dimensions.mass_kg only when no per-type row is found.
          const perTypeWeight = await this.flangeTypeWeightService.flangeTypeWeightForDesignation(
            nominalBoreMm,
            flangeDimension.pressureClass?.designation,
            flangeDimension.standard?.code,
          );
          const perFlangeWeight =
            perTypeWeight.found && perTypeWeight.weightKg !== null
              ? perTypeWeight.weightKg
              : flangeDimension.mass_kg || 0;
          flangeWeight = numberOfFlanges * perFlangeWeight;
          numberOfFlangeWelds = numberOfFlanges;

          const weldCircumference = Math.PI * (nominalBoreMm / 1000);
          totalFlangeWeldLength = numberOfFlangeWelds * 2 * weldCircumference;
        }
      }
    }

    const numberOfButtWelds = numberOfTangents > 0 ? numberOfTangents : 0;
    const weldCircumference = Math.PI * (nominalBoreMm / 1000);
    const totalButtWeldLength = numberOfButtWelds * weldCircumference;

    const totalBendWeight = bendWeight * quantity;
    const totalTangentWeight = tangentWeight * quantity;
    const totalSystemWeight = (bendWeight + tangentWeight + flangeWeight) * quantity;

    return {
      centerToFaceDimension: Number(bendData.centerToFaceMm),
      bendRadius: Number(bendData.radiusMm),
      totalBendWeight,
      totalTangentWeight,
      totalSystemWeight,
      numberOfFlanges: numberOfFlanges * quantity,
      numberOfFlangeWelds: numberOfFlangeWelds * quantity,
      numberOfButtWelds: numberOfButtWelds * quantity,
      totalFlangeWeldLength: totalFlangeWeldLength * quantity,
      totalButtWeldLength: totalButtWeldLength * quantity,
    };
  }

  private calculateBendWeight(
    bendData: BendCenterToFace,
    pipeDimension: PipeDimension,
    bendStyle: "pulled" | "segmented" = "pulled",
    pipeOdMm: number = 0,
  ): number {
    const centerLineRadius = Number(bendData.radiusMm);
    const angleRad = Number(bendData.radians);

    const effectiveRadius =
      bendStyle === "pulled" ? centerLineRadius + pipeOdMm / 2 : centerLineRadius;
    const arcLength = effectiveRadius * angleRad;

    const weightKg = (arcLength / 1000) * (pipeDimension.mass_kgm || 0);

    return weightKg * 1.12;
  }

  private calculateTangentWeight(tangentLengths: number[], pipeDimension: PipeDimension): number {
    if (!tangentLengths.length) return 0;

    const totalLengthMm = tangentLengths.reduce((sum, length) => sum + length, 0);
    const totalLengthM = totalLengthMm / 1000;

    return totalLengthM * (pipeDimension.mass_kgm || 0);
  }

  private calculateFlangeCount(numberOfTangents: number): number {
    return numberOfTangents > 0 ? 2 : 2;
  }
}
