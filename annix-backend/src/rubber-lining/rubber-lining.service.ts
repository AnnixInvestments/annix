import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RubberType } from './entities/rubber-type.entity';
import { RubberSpecification } from './entities/rubber-specification.entity';
import {
  RubberApplicationRating,
  RubberThicknessRecommendation,
  RubberAdhesionRequirement,
} from './entities/rubber-application.entity';
import {
  RubberTypeDto,
  RubberSpecificationDto,
  RubberApplicationRatingDto,
  RubberThicknessRecommendationDto,
  RubberAdhesionRequirementDto,
  RubberRecommendationRequestDto,
  RubberRecommendationDto,
  LineCalloutDto,
} from './dto/rubber-lining.dto';

@Injectable()
export class RubberLiningService {
  constructor(
    @InjectRepository(RubberType)
    private rubberTypeRepository: Repository<RubberType>,
    @InjectRepository(RubberSpecification)
    private rubberSpecRepository: Repository<RubberSpecification>,
    @InjectRepository(RubberApplicationRating)
    private applicationRatingRepository: Repository<RubberApplicationRating>,
    @InjectRepository(RubberThicknessRecommendation)
    private thicknessRepository: Repository<RubberThicknessRecommendation>,
    @InjectRepository(RubberAdhesionRequirement)
    private adhesionRepository: Repository<RubberAdhesionRequirement>,
  ) {}

  async allRubberTypes(): Promise<RubberTypeDto[]> {
    const types = await this.rubberTypeRepository.find({
      order: { typeNumber: 'ASC' },
    });
    return types.map(this.mapTypeToDto);
  }

  async rubberTypeById(id: number): Promise<RubberTypeDto | null> {
    const type = await this.rubberTypeRepository.findOne({ where: { id } });
    return type ? this.mapTypeToDto(type) : null;
  }

  async rubberTypeByNumber(typeNumber: number): Promise<RubberTypeDto | null> {
    const type = await this.rubberTypeRepository.findOne({
      where: { typeNumber },
    });
    return type ? this.mapTypeToDto(type) : null;
  }

  async allSpecifications(): Promise<RubberSpecificationDto[]> {
    const specs = await this.rubberSpecRepository.find({
      relations: ['rubberType'],
      order: { rubberTypeId: 'ASC', grade: 'ASC', hardnessClassIrhd: 'ASC' },
    });
    return specs.map(this.mapSpecToDto);
  }

  async specificationsByType(
    typeNumber: number,
  ): Promise<RubberSpecificationDto[]> {
    const type = await this.rubberTypeRepository.findOne({
      where: { typeNumber },
    });
    if (!type) return [];

    const specs = await this.rubberSpecRepository.find({
      where: { rubberTypeId: type.id },
      relations: ['rubberType'],
      order: { grade: 'ASC', hardnessClassIrhd: 'ASC' },
    });
    return specs.map(this.mapSpecToDto);
  }

  async specificationByLineCallout(
    typeNumber: number,
    grade: string,
    hardnessClass: number,
  ): Promise<RubberSpecificationDto | null> {
    const type = await this.rubberTypeRepository.findOne({
      where: { typeNumber },
    });
    if (!type) return null;

    const spec = await this.rubberSpecRepository.findOne({
      where: {
        rubberTypeId: type.id,
        grade: grade.toUpperCase(),
        hardnessClassIrhd: hardnessClass,
      },
      relations: ['rubberType'],
    });
    return spec ? this.mapSpecToDto(spec) : null;
  }

  async applicationRatings(
    typeNumber?: number,
    chemicalCategory?: string,
  ): Promise<RubberApplicationRatingDto[]> {
    const query = this.applicationRatingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.rubberType', 'rubberType');

    if (typeNumber) {
      query.andWhere('rubberType.typeNumber = :typeNumber', { typeNumber });
    }

    if (chemicalCategory) {
      query.andWhere('rating.chemicalCategory = :chemicalCategory', {
        chemicalCategory,
      });
    }

    const ratings = await query
      .orderBy('rubberType.typeNumber', 'ASC')
      .addOrderBy('rating.chemicalCategory', 'ASC')
      .getMany();

    return ratings.map(this.mapApplicationRatingToDto);
  }

  async thicknessRecommendations(): Promise<
    RubberThicknessRecommendationDto[]
  > {
    const recs = await this.thicknessRepository.find({
      order: { nominalThicknessMm: 'ASC' },
    });
    return recs.map(this.mapThicknessToDto);
  }

  async adhesionRequirements(
    typeNumber?: number,
  ): Promise<RubberAdhesionRequirementDto[]> {
    const query = this.adhesionRepository
      .createQueryBuilder('adhesion')
      .leftJoinAndSelect('adhesion.rubberType', 'rubberType');

    if (typeNumber) {
      query.andWhere('rubberType.typeNumber = :typeNumber', { typeNumber });
    }

    const reqs = await query
      .orderBy('rubberType.typeNumber', 'ASC')
      .addOrderBy('adhesion.vulcanizationMethod', 'ASC')
      .getMany();

    return reqs.map(this.mapAdhesionToDto);
  }

  async recommendRubberLining(
    request: RubberRecommendationRequestDto,
  ): Promise<RubberRecommendationDto> {
    const allTypes = await this.rubberTypeRepository.find();
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let suitableTypeIds: number[] = allTypes.map((t) => t.id);

    if (
      request.maxTemperatureCelsius !== undefined &&
      request.maxTemperatureCelsius !== null
    ) {
      const tempFiltered = allTypes.filter(
        (t) => Number(t.tempMaxCelsius) >= request.maxTemperatureCelsius!,
      );
      suitableTypeIds = suitableTypeIds.filter((id) =>
        tempFiltered.some((t) => t.id === id),
      );
      reasoning.push(
        `Filtered for max operating temperature ${request.maxTemperatureCelsius}°C`,
      );
    }

    if (
      request.minTemperatureCelsius !== undefined &&
      request.minTemperatureCelsius !== null
    ) {
      const tempFiltered = allTypes.filter(
        (t) => Number(t.tempMinCelsius) <= request.minTemperatureCelsius!,
      );
      suitableTypeIds = suitableTypeIds.filter((id) =>
        tempFiltered.some((t) => t.id === id),
      );
      reasoning.push(
        `Filtered for min operating temperature ${request.minTemperatureCelsius}°C`,
      );
    }

    if (request.requiresOilResistance) {
      const oilResistant = allTypes.filter(
        (t) =>
          t.oilResistance === 'excellent' ||
          t.oilResistance === 'good' ||
          t.oilResistance === 'medium',
      );
      suitableTypeIds = suitableTypeIds.filter((id) =>
        oilResistant.some((t) => t.id === id),
      );
      reasoning.push('Filtered for oil resistance requirement');

      const type1 = allTypes.find((t) => t.typeNumber === 1);
      if (type1 && suitableTypeIds.includes(type1.id)) {
        suitableTypeIds = suitableTypeIds.filter((id) => id !== type1.id);
        warnings.push(
          'Type 1 (Natural/SBR rubber) excluded - not suitable for oil exposure',
        );
      }
    }

    if (request.requiresOzoneResistance) {
      const ozoneResistant = allTypes.filter(
        (t) =>
          t.ozoneResistance === 'excellent' || t.ozoneResistance === 'good',
      );
      suitableTypeIds = suitableTypeIds.filter((id) =>
        ozoneResistant.some((t) => t.id === id),
      );
      reasoning.push('Filtered for ozone resistance requirement');

      const type1 = allTypes.find((t) => t.typeNumber === 1);
      if (type1 && !ozoneResistant.some((t) => t.id === type1.id)) {
        warnings.push(
          'Type 1 (Natural/SBR rubber) not recommended for ozone exposure',
        );
      }
    }

    if (request.chemicalExposure && request.chemicalExposure.length > 0) {
      const ratings = await this.applicationRatingRepository.find({
        where: {
          chemicalCategory: In(request.chemicalExposure),
          resistanceRating: In(['excellent', 'good']),
        },
        relations: ['rubberType'],
      });

      const chemicalSuitableIds = [
        ...new Set(ratings.map((r) => r.rubberTypeId)),
      ];
      suitableTypeIds = suitableTypeIds.filter((id) =>
        chemicalSuitableIds.includes(id),
      );
      reasoning.push(
        `Filtered for chemical resistance: ${request.chemicalExposure.join(', ')}`,
      );
    }

    if (request.abrasionLevel === 'very_high') {
      reasoning.push(
        'High abrasion environment - consider ceramic-rubber composite or harder rubber grades',
      );
      warnings.push(
        'Very high abrasion may require additional ceramic tile protection over rubber lining',
      );
    }

    if (request.corrosionLevel === 'very_high') {
      const type2 = allTypes.find((t) => t.typeNumber === 2);
      const type5 = allTypes.find((t) => t.typeNumber === 5);
      if (type2 || type5) {
        reasoning.push(
          'Very high corrosion - Type 2 (Butyl) or Type 5 (CSM) recommended for chemical resistance',
        );
      }
    }

    const recommendedTypes = allTypes.filter((t) =>
      suitableTypeIds.includes(t.id),
    );

    let recommendedSpecs: RubberSpecification[] = [];
    if (suitableTypeIds.length > 0) {
      recommendedSpecs = await this.rubberSpecRepository.find({
        where: { rubberTypeId: In(suitableTypeIds) },
        relations: ['rubberType'],
        order: { grade: 'ASC', hardnessClassIrhd: 'ASC' },
      });
    }

    if (
      request.abrasionLevel === 'high' ||
      request.abrasionLevel === 'very_high'
    ) {
      recommendedSpecs = recommendedSpecs.filter(
        (s) => s.hardnessClassIrhd >= 60,
      );
      reasoning.push(
        'High abrasion requires harder rubber - recommending 60+ IRHD hardness class',
      );
    }

    return {
      recommendedTypes: recommendedTypes.map(this.mapTypeToDto),
      recommendedSpecifications: recommendedSpecs.map(this.mapSpecToDto),
      reasoning,
      warnings,
      sansCompliance: {
        sans1198: true,
        sans1201: true,
      },
    };
  }

  generateLineCallout(
    typeNumber: number,
    grade: string,
    hardnessClass: number,
    specialProperties: number[] = [],
  ): LineCalloutDto {
    const specialPropertyMap: Record<number, string> = {
      1: 'I (Heat Resistance)',
      2: 'II (Ozone Resistance)',
      3: 'III (Chemical Resistance)',
      4: 'IV (Abrasion Resistance)',
      5: 'V (Contaminant Release Resistance)',
      6: 'VI (Water Resistance)',
      7: 'VII (Oil Resistance)',
    };

    const specialPropsRoman = specialProperties.map(
      (p) => `(${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][p - 1]})`,
    );
    const specialPropsDescriptions = specialProperties.map(
      (p) => specialPropertyMap[p] || `Property ${p}`,
    );

    const fullCallout = `${typeNumber} ${grade} ${hardnessClass}${specialPropsRoman.length > 0 ? ' ' + specialPropsRoman.join(' ') : ''}`;

    return {
      type: typeNumber,
      grade,
      hardnessClass,
      specialProperties: specialPropsDescriptions,
      fullCallout,
      description: `SANS 1198:2013 Line Call-out: Type ${typeNumber}, Grade ${grade} (${this.gradeDescription(grade)}), ${hardnessClass} IRHD hardness${specialPropsDescriptions.length > 0 ? ', with ' + specialPropsDescriptions.join(', ') : ''}`,
    };
  }

  private gradeDescription(grade: string): string {
    const descriptions: Record<string, string> = {
      A: '≥18 MPa tensile strength',
      B: '≥14 MPa tensile strength',
      C: '≥7 MPa tensile strength',
      D: 'Ebonite (hard rubber)',
    };
    return descriptions[grade.toUpperCase()] || 'Unknown grade';
  }

  private mapTypeToDto(type: RubberType): RubberTypeDto {
    return {
      id: type.id,
      typeNumber: type.typeNumber,
      typeName: type.typeName,
      polymerCodes: type.polymerCodes,
      polymerNames: type.polymerNames,
      description: type.description,
      tempMinCelsius: Number(type.tempMinCelsius),
      tempMaxCelsius: Number(type.tempMaxCelsius),
      ozoneResistance: type.ozoneResistance,
      oilResistance: type.oilResistance,
      chemicalResistanceNotes: type.chemicalResistanceNotes,
      notSuitableFor: type.notSuitableFor,
      typicalApplications: type.typicalApplications,
    };
  }

  private mapSpecToDto(spec: RubberSpecification): RubberSpecificationDto {
    return {
      id: spec.id,
      rubberTypeId: spec.rubberTypeId,
      rubberTypeName: spec.rubberType?.typeName || null,
      grade: spec.grade,
      hardnessClassIrhd: spec.hardnessClassIrhd,
      tensileStrengthMpaMin: Number(spec.tensileStrengthMpaMin),
      elongationAtBreakMin: spec.elongationAtBreakMin,
      tensileAfterAgeingMinPercent: spec.tensileAfterAgeingMinPercent,
      tensileAfterAgeingMaxPercent: spec.tensileAfterAgeingMaxPercent,
      elongationAfterAgeingMinPercent: spec.elongationAfterAgeingMinPercent,
      elongationAfterAgeingMaxPercent: spec.elongationAfterAgeingMaxPercent,
      hardnessChangeAfterAgeingMax: spec.hardnessChangeAfterAgeingMax,
      heatResistance80cHardnessChangeMax:
        spec.heatResistance80cHardnessChangeMax,
      heatResistance100cHardnessChangeMax:
        spec.heatResistance100cHardnessChangeMax,
      ozoneResistance: spec.ozoneResistance,
      chemicalResistanceHardnessChangeMax:
        spec.chemicalResistanceHardnessChangeMax,
      waterResistanceMaxPercent: spec.waterResistanceMaxPercent,
      oilResistanceMaxPercent: spec.oilResistanceMaxPercent,
      contaminantReleaseMaxPercent: spec.contaminantReleaseMaxPercent,
      sansStandard: spec.sansStandard,
    };
  }

  private mapApplicationRatingToDto(
    rating: RubberApplicationRating,
  ): RubberApplicationRatingDto {
    return {
      id: rating.id,
      rubberTypeId: rating.rubberTypeId,
      rubberTypeName: rating.rubberType?.typeName || null,
      chemicalCategory: rating.chemicalCategory,
      resistanceRating: rating.resistanceRating,
      maxTempCelsius: rating.maxTempCelsius
        ? Number(rating.maxTempCelsius)
        : null,
      maxConcentrationPercent: rating.maxConcentrationPercent
        ? Number(rating.maxConcentrationPercent)
        : null,
      notes: rating.notes,
    };
  }

  private mapThicknessToDto(
    rec: RubberThicknessRecommendation,
  ): RubberThicknessRecommendationDto {
    return {
      id: rec.id,
      nominalThicknessMm: Number(rec.nominalThicknessMm),
      minPlies: rec.minPlies,
      maxPlyThicknessMm: Number(rec.maxPlyThicknessMm),
      applicationNotes: rec.applicationNotes,
      suitableForComplexShapes: rec.suitableForComplexShapes,
    };
  }

  private mapAdhesionToDto(
    req: RubberAdhesionRequirement,
  ): RubberAdhesionRequirementDto {
    return {
      id: req.id,
      rubberTypeId: req.rubberTypeId,
      rubberTypeName: req.rubberType?.typeName || null,
      vulcanizationMethod: req.vulcanizationMethod,
      minAdhesionNPerMm: Number(req.minAdhesionNPerMm),
      testStandard: req.testStandard,
    };
  }
}
