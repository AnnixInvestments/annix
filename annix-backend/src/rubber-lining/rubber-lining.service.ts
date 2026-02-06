import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { generateUniqueId, nowMillis } from '../lib/datetime';
import { RubberType } from './entities/rubber-type.entity';
import { RubberSpecification } from './entities/rubber-specification.entity';
import {
  RubberApplicationRating,
  RubberThicknessRecommendation,
  RubberAdhesionRequirement,
} from './entities/rubber-application.entity';
import {
  RubberProductCoding,
  ProductCodingType,
} from './entities/rubber-product-coding.entity';
import { RubberPricingTier } from './entities/rubber-pricing-tier.entity';
import { RubberCompany } from './entities/rubber-company.entity';
import { RubberProduct } from './entities/rubber-product.entity';
import {
  RubberOrder,
  RubberOrderStatus,
  StatusHistoryEvent,
} from './entities/rubber-order.entity';
import { RubberOrderItem } from './entities/rubber-order-item.entity';
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
import {
  RubberProductCodingDto,
  CreateRubberProductCodingDto,
  UpdateRubberProductCodingDto,
  RubberPricingTierDto,
  CreateRubberPricingTierDto,
  UpdateRubberPricingTierDto,
  RubberCompanyDto,
  CreateRubberCompanyDto,
  UpdateRubberCompanyDto,
  RubberProductDto,
  CreateRubberProductDto,
  UpdateRubberProductDto,
  RubberOrderDto,
  RubberOrderItemDto,
  CreateRubberOrderDto,
  UpdateRubberOrderDto,
  RubberPriceCalculationRequestDto,
  RubberPriceCalculationDto,
  ImportProductRowDto,
  ImportProductsResultDto,
  ImportProductRowResultDto,
} from './dto/rubber-portal.dto';

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
    @InjectRepository(RubberProductCoding)
    private productCodingRepository: Repository<RubberProductCoding>,
    @InjectRepository(RubberPricingTier)
    private pricingTierRepository: Repository<RubberPricingTier>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberProduct)
    private productRepository: Repository<RubberProduct>,
    @InjectRepository(RubberOrder)
    private orderRepository: Repository<RubberOrder>,
    @InjectRepository(RubberOrderItem)
    private orderItemRepository: Repository<RubberOrderItem>,
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

  async allProductCodings(
    codingType?: ProductCodingType,
  ): Promise<RubberProductCodingDto[]> {
    const where = codingType ? { codingType } : {};
    const codings = await this.productCodingRepository.find({
      where,
      order: { codingType: 'ASC', code: 'ASC' },
    });
    return codings.map(this.mapProductCodingToDto);
  }

  async productCodingById(id: number): Promise<RubberProductCodingDto | null> {
    const coding = await this.productCodingRepository.findOne({ where: { id } });
    return coding ? this.mapProductCodingToDto(coding) : null;
  }

  async createProductCoding(
    dto: CreateRubberProductCodingDto,
  ): Promise<RubberProductCodingDto> {
    const coding = this.productCodingRepository.create({
      ...dto,
      firebaseUid: `pg_${generateUniqueId()}`,
    });
    const saved = await this.productCodingRepository.save(coding);
    return this.mapProductCodingToDto(saved);
  }

  async updateProductCoding(
    id: number,
    dto: UpdateRubberProductCodingDto,
  ): Promise<RubberProductCodingDto | null> {
    const coding = await this.productCodingRepository.findOne({ where: { id } });
    if (!coding) return null;
    Object.assign(coding, dto);
    const saved = await this.productCodingRepository.save(coding);
    return this.mapProductCodingToDto(saved);
  }

  async deleteProductCoding(id: number): Promise<boolean> {
    const result = await this.productCodingRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async allPricingTiers(): Promise<RubberPricingTierDto[]> {
    const tiers = await this.pricingTierRepository.find({
      order: { pricingFactor: 'ASC' },
    });
    return tiers.map(this.mapPricingTierToDto);
  }

  async pricingTierById(id: number): Promise<RubberPricingTierDto | null> {
    const tier = await this.pricingTierRepository.findOne({ where: { id } });
    return tier ? this.mapPricingTierToDto(tier) : null;
  }

  async createPricingTier(
    dto: CreateRubberPricingTierDto,
  ): Promise<RubberPricingTierDto> {
    const tier = this.pricingTierRepository.create({
      ...dto,
      firebaseUid: `pg_${generateUniqueId()}`,
    });
    const saved = await this.pricingTierRepository.save(tier);
    return this.mapPricingTierToDto(saved);
  }

  async updatePricingTier(
    id: number,
    dto: UpdateRubberPricingTierDto,
  ): Promise<RubberPricingTierDto | null> {
    const tier = await this.pricingTierRepository.findOne({ where: { id } });
    if (!tier) return null;
    Object.assign(tier, dto);
    const saved = await this.pricingTierRepository.save(tier);
    return this.mapPricingTierToDto(saved);
  }

  async deletePricingTier(id: number): Promise<boolean> {
    const result = await this.pricingTierRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async allCompanies(): Promise<RubberCompanyDto[]> {
    const companies = await this.companyRepository.find({
      relations: ['pricingTier'],
      order: { name: 'ASC' },
    });
    return companies.map((c) => this.mapCompanyToDto(c));
  }

  async companyById(id: number): Promise<RubberCompanyDto | null> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['pricingTier'],
    });
    return company ? this.mapCompanyToDto(company) : null;
  }

  async createCompany(dto: CreateRubberCompanyDto): Promise<RubberCompanyDto> {
    const company = new RubberCompany();
    company.firebaseUid = `pg_${generateUniqueId()}`;
    company.name = dto.name;
    company.code = dto.code || null;
    company.pricingTierId = dto.pricingTierId || null;
    company.availableProducts = dto.availableProducts || [];
    company.isCompoundOwner = dto.isCompoundOwner || false;
    company.vatNumber = dto.vatNumber || null;
    company.registrationNumber = dto.registrationNumber || null;
    company.address = dto.address || null;
    company.notes = dto.notes || null;

    const saved = await this.companyRepository.save(company);
    const result = await this.companyRepository.findOne({
      where: { id: saved.id },
      relations: ['pricingTier'],
    });
    return this.mapCompanyToDto(result!);
  }

  async updateCompany(
    id: number,
    dto: UpdateRubberCompanyDto,
  ): Promise<RubberCompanyDto | null> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) return null;

    if (dto.name !== undefined) company.name = dto.name;
    if (dto.code !== undefined) company.code = dto.code || null;
    if (dto.pricingTierId !== undefined)
      company.pricingTierId = dto.pricingTierId || null;
    if (dto.availableProducts !== undefined)
      company.availableProducts = dto.availableProducts;
    if (dto.isCompoundOwner !== undefined)
      company.isCompoundOwner = dto.isCompoundOwner;
    if (dto.vatNumber !== undefined) company.vatNumber = dto.vatNumber || null;
    if (dto.registrationNumber !== undefined)
      company.registrationNumber = dto.registrationNumber || null;
    if (dto.address !== undefined) company.address = dto.address || null;
    if (dto.notes !== undefined) company.notes = dto.notes || null;

    await this.companyRepository.save(company);
    const result = await this.companyRepository.findOne({
      where: { id },
      relations: ['pricingTier'],
    });
    return this.mapCompanyToDto(result!);
  }

  async deleteCompany(id: number): Promise<boolean> {
    const result = await this.companyRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async allProducts(): Promise<RubberProductDto[]> {
    const products = await this.productRepository.find({
      order: { title: 'ASC' },
    });
    const codings = await this.productCodingRepository.find();
    const companies = await this.companyRepository.find();
    return products.map((p) => this.mapProductToDto(p, codings, companies));
  }

  async productById(id: number): Promise<RubberProductDto | null> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) return null;
    const codings = await this.productCodingRepository.find();
    const companies = await this.companyRepository.find();
    return this.mapProductToDto(product, codings, companies);
  }

  private async validateProductCodingRelationships(
    dto: CreateRubberProductDto | UpdateRubberProductDto,
  ): Promise<void> {
    const errors: string[] = [];

    const codingValidations: Array<{
      uid: string | undefined;
      field: string;
      expectedType: ProductCodingType;
    }> = [
      { uid: dto.compoundFirebaseUid, field: 'compound', expectedType: ProductCodingType.COMPOUND },
      { uid: dto.typeFirebaseUid, field: 'type', expectedType: ProductCodingType.TYPE },
      { uid: dto.colourFirebaseUid, field: 'colour', expectedType: ProductCodingType.COLOUR },
      { uid: dto.hardnessFirebaseUid, field: 'hardness', expectedType: ProductCodingType.HARDNESS },
      { uid: dto.curingMethodFirebaseUid, field: 'curingMethod', expectedType: ProductCodingType.CURING_METHOD },
      { uid: dto.gradeFirebaseUid, field: 'grade', expectedType: ProductCodingType.GRADE },
    ];

    const codingUidsToValidate = codingValidations
      .filter((v) => v.uid)
      .map((v) => v.uid!);

    if (codingUidsToValidate.length > 0) {
      const codings = await this.productCodingRepository.find({
        where: { firebaseUid: In(codingUidsToValidate) },
      });

      codingValidations.forEach((validation) => {
        if (validation.uid) {
          const coding = codings.find((c) => c.firebaseUid === validation.uid);
          if (!coding) {
            errors.push(`Invalid ${validation.field}: coding with UID '${validation.uid}' not found`);
          } else if (coding.codingType !== validation.expectedType) {
            errors.push(
              `Invalid ${validation.field}: coding '${validation.uid}' is type '${coding.codingType}', expected '${validation.expectedType}'`,
            );
          }
        }
      });
    }

    if (dto.compoundOwnerFirebaseUid) {
      const company = await this.companyRepository.findOne({
        where: { firebaseUid: dto.compoundOwnerFirebaseUid },
      });
      if (!company) {
        errors.push(`Invalid compoundOwner: company with UID '${dto.compoundOwnerFirebaseUid}' not found`);
      } else if (!company.isCompoundOwner) {
        errors.push(`Invalid compoundOwner: company '${company.name}' is not marked as a compound owner`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  async createProduct(dto: CreateRubberProductDto): Promise<RubberProductDto> {
    await this.validateProductCodingRelationships(dto);
    const product = this.productRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      title: dto.title || null,
      description: dto.description || null,
      specificGravity: dto.specificGravity || null,
      compoundOwnerFirebaseUid: dto.compoundOwnerFirebaseUid || null,
      compoundFirebaseUid: dto.compoundFirebaseUid || null,
      typeFirebaseUid: dto.typeFirebaseUid || null,
      costPerKg: dto.costPerKg || null,
      colourFirebaseUid: dto.colourFirebaseUid || null,
      hardnessFirebaseUid: dto.hardnessFirebaseUid || null,
      curingMethodFirebaseUid: dto.curingMethodFirebaseUid || null,
      gradeFirebaseUid: dto.gradeFirebaseUid || null,
      markup: dto.markup || null,
    });
    const saved = await this.productRepository.save(product);
    const codings = await this.productCodingRepository.find();
    const companies = await this.companyRepository.find();
    return this.mapProductToDto(saved, codings, companies);
  }

  async updateProduct(
    id: number,
    dto: UpdateRubberProductDto,
  ): Promise<RubberProductDto | null> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) return null;

    await this.validateProductCodingRelationships(dto);

    if (dto.title !== undefined) product.title = dto.title || null;
    if (dto.description !== undefined)
      product.description = dto.description || null;
    if (dto.specificGravity !== undefined)
      product.specificGravity = dto.specificGravity || null;
    if (dto.compoundOwnerFirebaseUid !== undefined)
      product.compoundOwnerFirebaseUid = dto.compoundOwnerFirebaseUid || null;
    if (dto.compoundFirebaseUid !== undefined)
      product.compoundFirebaseUid = dto.compoundFirebaseUid || null;
    if (dto.typeFirebaseUid !== undefined)
      product.typeFirebaseUid = dto.typeFirebaseUid || null;
    if (dto.costPerKg !== undefined) product.costPerKg = dto.costPerKg || null;
    if (dto.colourFirebaseUid !== undefined)
      product.colourFirebaseUid = dto.colourFirebaseUid || null;
    if (dto.hardnessFirebaseUid !== undefined)
      product.hardnessFirebaseUid = dto.hardnessFirebaseUid || null;
    if (dto.curingMethodFirebaseUid !== undefined)
      product.curingMethodFirebaseUid = dto.curingMethodFirebaseUid || null;
    if (dto.gradeFirebaseUid !== undefined)
      product.gradeFirebaseUid = dto.gradeFirebaseUid || null;
    if (dto.markup !== undefined) product.markup = dto.markup || null;

    const saved = await this.productRepository.save(product);
    const codings = await this.productCodingRepository.find();
    const companies = await this.companyRepository.find();
    return this.mapProductToDto(saved, codings, companies);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.productRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async importProducts(
    rows: ImportProductRowDto[],
    updateExisting: boolean = false,
  ): Promise<ImportProductsResultDto> {
    const codings = await this.productCodingRepository.find();
    const companies = await this.companyRepository.find();
    const existingProducts = await this.productRepository.find();

    const codingLookup = (name: string | undefined, type: ProductCodingType): string | null => {
      if (!name) return null;
      const coding = codings.find(
        (c) => c.codingType === type && c.name.toLowerCase() === name.toLowerCase(),
      );
      return coding?.firebaseUid || null;
    };

    const companyLookup = (name: string | undefined): string | null => {
      if (!name) return null;
      const company = companies.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() && c.isCompoundOwner,
      );
      return company?.firebaseUid || null;
    };

    const results: ImportProductRowResultDto[] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];

      const typeUid = codingLookup(row.type, ProductCodingType.TYPE);
      const compoundUid = codingLookup(row.compound, ProductCodingType.COMPOUND);
      const colourUid = codingLookup(row.colour, ProductCodingType.COLOUR);
      const hardnessUid = codingLookup(row.hardness, ProductCodingType.HARDNESS);
      const gradeUid = codingLookup(row.grade, ProductCodingType.GRADE);
      const curingMethodUid = codingLookup(row.curingMethod, ProductCodingType.CURING_METHOD);
      const compoundOwnerUid = companyLookup(row.compoundOwner);

      if (row.type && !typeUid) errors.push(`Type '${row.type}' not found`);
      if (row.compound && !compoundUid) errors.push(`Compound '${row.compound}' not found`);
      if (row.colour && !colourUid) errors.push(`Colour '${row.colour}' not found`);
      if (row.hardness && !hardnessUid) errors.push(`Hardness '${row.hardness}' not found`);
      if (row.grade && !gradeUid) errors.push(`Grade '${row.grade}' not found`);
      if (row.curingMethod && !curingMethodUid) errors.push(`Curing method '${row.curingMethod}' not found`);
      if (row.compoundOwner && !compoundOwnerUid) errors.push(`Compound owner '${row.compoundOwner}' not found or not marked as compound owner`);

      if (errors.length > 0) {
        failed++;
        results.push({
          rowIndex: i,
          status: 'failed',
          title: row.title || null,
          errors,
        });
        continue;
      }

      let existingProduct = row.firebaseUid
        ? existingProducts.find((p) => p.firebaseUid === row.firebaseUid)
        : existingProducts.find((p) => p.title && row.title && p.title.toLowerCase() === row.title.toLowerCase());

      if (existingProduct && !updateExisting) {
        skipped++;
        results.push({
          rowIndex: i,
          status: 'skipped',
          title: row.title || null,
          errors: ['Product already exists and updateExisting is false'],
          productId: existingProduct.id,
        });
        continue;
      }

      try {
        if (existingProduct) {
          if (row.title !== undefined) existingProduct.title = row.title || null;
          if (row.description !== undefined) existingProduct.description = row.description || null;
          if (row.specificGravity !== undefined) existingProduct.specificGravity = row.specificGravity || null;
          if (row.costPerKg !== undefined) existingProduct.costPerKg = row.costPerKg || null;
          if (row.markup !== undefined) existingProduct.markup = row.markup || null;
          if (typeUid !== undefined) existingProduct.typeFirebaseUid = typeUid;
          if (compoundUid !== undefined) existingProduct.compoundFirebaseUid = compoundUid;
          if (colourUid !== undefined) existingProduct.colourFirebaseUid = colourUid;
          if (hardnessUid !== undefined) existingProduct.hardnessFirebaseUid = hardnessUid;
          if (gradeUid !== undefined) existingProduct.gradeFirebaseUid = gradeUid;
          if (curingMethodUid !== undefined) existingProduct.curingMethodFirebaseUid = curingMethodUid;
          if (compoundOwnerUid !== undefined) existingProduct.compoundOwnerFirebaseUid = compoundOwnerUid;

          await this.productRepository.save(existingProduct);
          updated++;
          results.push({
            rowIndex: i,
            status: 'updated',
            title: row.title || null,
            errors: [],
            productId: existingProduct.id,
          });
        } else {
          const product = this.productRepository.create({
            firebaseUid: `pg_${generateUniqueId()}`,
            title: row.title || null,
            description: row.description || null,
            specificGravity: row.specificGravity || null,
            costPerKg: row.costPerKg || null,
            markup: row.markup || null,
            typeFirebaseUid: typeUid,
            compoundFirebaseUid: compoundUid,
            colourFirebaseUid: colourUid,
            hardnessFirebaseUid: hardnessUid,
            gradeFirebaseUid: gradeUid,
            curingMethodFirebaseUid: curingMethodUid,
            compoundOwnerFirebaseUid: compoundOwnerUid,
          });
          const saved = await this.productRepository.save(product);
          existingProducts.push(saved);
          created++;
          results.push({
            rowIndex: i,
            status: 'created',
            title: row.title || null,
            errors: [],
            productId: saved.id,
          });
        }
      } catch (err) {
        failed++;
        results.push({
          rowIndex: i,
          status: 'failed',
          title: row.title || null,
          errors: [err instanceof Error ? err.message : 'Unknown error'],
        });
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      failed,
      skipped,
      results,
    };
  }

  async allOrders(status?: RubberOrderStatus): Promise<RubberOrderDto[]> {
    const where = status !== undefined ? { status } : {};
    const orders = await this.orderRepository.find({
      where,
      relations: ['company', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
    return orders.map((o) => this.mapOrderToDto(o));
  }

  async orderById(id: number): Promise<RubberOrderDto | null> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['company', 'items', 'items.product'],
    });
    return order ? this.mapOrderToDto(order) : null;
  }

  async createOrder(dto: CreateRubberOrderDto): Promise<RubberOrderDto> {
    const lastOrder = await this.orderRepository
      .createQueryBuilder('order')
      .orderBy('order.id', 'DESC')
      .getOne();
    const nextNumber = (lastOrder?.id || 0) + 1;
    const orderNumber = dto.orderNumber || `ORD-${String(nextNumber).padStart(5, '0')}`;

    const order = this.orderRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      orderNumber,
      companyOrderNumber: dto.companyOrderNumber || null,
      status: RubberOrderStatus.DRAFT,
      companyId: dto.companyId || null,
    });
    const savedOrder = await this.orderRepository.save(order);

    if (dto.items && dto.items.length > 0) {
      const items = dto.items.map((item) =>
        this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId || null,
          thickness: item.thickness || null,
          width: item.width || null,
          length: item.length || null,
          quantity: item.quantity || null,
          callOffs: item.callOffs || [],
        }),
      );
      await this.orderItemRepository.save(items);
    }

    const result = await this.orderRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['company', 'items', 'items.product'],
    });
    return this.mapOrderToDto(result!);
  }

  async updateOrder(
    id: number,
    dto: UpdateRubberOrderDto,
  ): Promise<RubberOrderDto | null> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) return null;

    if (dto.companyOrderNumber !== undefined)
      order.companyOrderNumber = dto.companyOrderNumber || null;
    if (dto.status !== undefined && dto.status !== order.status) {
      const historyEvent: StatusHistoryEvent = {
        timestamp: nowMillis(),
        fromStatus: order.status,
        toStatus: dto.status,
      };
      order.statusHistory = [...(order.statusHistory || []), historyEvent];
      order.status = dto.status;
    }
    if (dto.companyId !== undefined) order.companyId = dto.companyId || null;

    await this.orderRepository.save(order);

    if (dto.items !== undefined) {
      await this.orderItemRepository.delete({ orderId: id });
      const items = dto.items.map((item) =>
        this.orderItemRepository.create({
          orderId: id,
          productId: item.productId || null,
          thickness: item.thickness || null,
          width: item.width || null,
          length: item.length || null,
          quantity: item.quantity || null,
          callOffs: item.callOffs || [],
        }),
      );
      await this.orderItemRepository.save(items);
    }

    const result = await this.orderRepository.findOne({
      where: { id },
      relations: ['company', 'items', 'items.product'],
    });
    return this.mapOrderToDto(result!);
  }

  async deleteOrder(id: number): Promise<boolean> {
    const result = await this.orderRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  /**
   * Calculates the price for a rubber roll order based on product, company, and dimensions.
   *
   * Price Calculation Formula:
   * 1. pricePerKg = costPerKg × (markup / 100)
   *    - costPerKg: Base cost from product definition
   *    - markup: Product markup percentage (default 100% = no markup)
   *
   * 2. salePricePerKg = pricePerKg × (pricingFactor / 100)
   *    - pricingFactor: Company-specific pricing tier (e.g., 90% for preferred customers)
   *
   * 3. kgPerRoll = thickness(mm) × (width(mm) / 1000) × length(m) × specificGravity
   *    - Converts dimensions to calculate volume in cubic meters, then weight
   *    - specificGravity: Product density relative to water (default 1.0)
   *
   * 4. totalKg = kgPerRoll × quantity
   *
   * 5. totalPrice = totalKg × salePricePerKg
   *
   * @param request - Contains productId, companyId, thickness (mm), width (mm), length (m), quantity
   * @returns Price calculation breakdown or null if product/company not found
   */
  async calculatePrice(
    request: RubberPriceCalculationRequestDto,
  ): Promise<RubberPriceCalculationDto | null> {
    const product = await this.productRepository.findOne({
      where: { id: request.productId },
    });
    const company = await this.companyRepository.findOne({
      where: { id: request.companyId },
      relations: ['pricingTier'],
    });

    if (!product || !company) return null;

    const specificGravity = Number(product.specificGravity) || 1;
    const costPerKg = Number(product.costPerKg) || 0;
    const markup = Number(product.markup) || 100;
    const pricingFactor = Number(company.pricingTier?.pricingFactor) || 100;

    const pricePerKg = costPerKg * (markup / 100);
    const salePricePerKg = pricePerKg * (pricingFactor / 100);
    const kgPerRoll =
      request.thickness * (request.width / 1000) * request.length * specificGravity;
    const totalKg = kgPerRoll * request.quantity;
    const totalPrice = totalKg * salePricePerKg;

    return {
      productTitle: product.title,
      companyName: company.name,
      specificGravity,
      costPerKg,
      markup,
      pricePerKg,
      pricingFactor,
      salePricePerKg,
      kgPerRoll,
      totalKg,
      totalPrice,
    };
  }

  private mapProductCodingToDto(
    coding: RubberProductCoding,
  ): RubberProductCodingDto {
    return {
      id: coding.id,
      firebaseUid: coding.firebaseUid,
      codingType: coding.codingType,
      code: coding.code,
      name: coding.name,
    };
  }

  private mapPricingTierToDto(tier: RubberPricingTier): RubberPricingTierDto {
    return {
      id: tier.id,
      name: tier.name,
      pricingFactor: Number(tier.pricingFactor),
    };
  }

  private mapCompanyToDto(company: RubberCompany): RubberCompanyDto {
    return {
      id: company.id,
      firebaseUid: company.firebaseUid,
      name: company.name,
      code: company.code,
      pricingTierId: company.pricingTierId,
      pricingTierName: company.pricingTier?.name || null,
      pricingFactor: company.pricingTier
        ? Number(company.pricingTier.pricingFactor)
        : null,
      availableProducts: company.availableProducts,
      isCompoundOwner: company.isCompoundOwner,
      vatNumber: company.vatNumber,
      registrationNumber: company.registrationNumber,
      address: company.address,
      notes: company.notes,
    };
  }

  /**
   * Maps a RubberProduct entity to its DTO representation.
   *
   * Price calculation formula:
   *   pricePerKg = costPerKg × (markup / 100)
   *
   * Where:
   *   - costPerKg: Base cost per kilogram from product definition
   *   - markup: Percentage multiplier (default 100 = 1x, 150 = 1.5x)
   *
   * Note: This is the base price. Final sale price is calculated in calculatePrice()
   * which applies the company's pricing factor.
   *
   * @param product - The product entity to map
   * @param codings - All product codings for name resolution
   * @param companies - All companies for compound owner name resolution
   * @returns The mapped product DTO with resolved names and calculated price
   */
  private mapProductToDto(
    product: RubberProduct,
    codings: RubberProductCoding[],
    companies: RubberCompany[],
  ): RubberProductDto {
    const codingName = (uid: string | null): string | null => {
      if (!uid) return null;
      const coding = codings.find((c) => c.firebaseUid === uid);
      return coding ? coding.name : null;
    };

    const companyName = (uid: string | null): string | null => {
      if (!uid) return null;
      const company = companies.find((c) => c.firebaseUid === uid);
      return company ? company.name : null;
    };

    const costPerKg = Number(product.costPerKg) || 0;
    const markup = Number(product.markup) || 100;
    const pricePerKg = costPerKg * (markup / 100);

    return {
      id: product.id,
      firebaseUid: product.firebaseUid,
      title: product.title,
      description: product.description,
      specificGravity: product.specificGravity
        ? Number(product.specificGravity)
        : null,
      compoundOwnerName: companyName(product.compoundOwnerFirebaseUid),
      compoundOwnerFirebaseUid: product.compoundOwnerFirebaseUid,
      compoundName: codingName(product.compoundFirebaseUid),
      compoundFirebaseUid: product.compoundFirebaseUid,
      typeName: codingName(product.typeFirebaseUid),
      typeFirebaseUid: product.typeFirebaseUid,
      costPerKg: costPerKg || null,
      colourName: codingName(product.colourFirebaseUid),
      colourFirebaseUid: product.colourFirebaseUid,
      hardnessName: codingName(product.hardnessFirebaseUid),
      hardnessFirebaseUid: product.hardnessFirebaseUid,
      curingMethodName: codingName(product.curingMethodFirebaseUid),
      curingMethodFirebaseUid: product.curingMethodFirebaseUid,
      gradeName: codingName(product.gradeFirebaseUid),
      gradeFirebaseUid: product.gradeFirebaseUid,
      markup: markup !== 100 ? markup : null,
      pricePerKg: pricePerKg || null,
    };
  }

  private mapOrderToDto(order: RubberOrder): RubberOrderDto {
    const statusLabels: Record<RubberOrderStatus, string> = {
      [RubberOrderStatus.NEW]: 'New',
      [RubberOrderStatus.DRAFT]: 'Draft',
      [RubberOrderStatus.CANCELLED]: 'Cancelled',
      [RubberOrderStatus.PARTIALLY_SUBMITTED]: 'Partially Submitted',
      [RubberOrderStatus.SUBMITTED]: 'Submitted',
      [RubberOrderStatus.MANUFACTURING]: 'Manufacturing',
      [RubberOrderStatus.DELIVERING]: 'Delivering',
      [RubberOrderStatus.COMPLETE]: 'Complete',
    };

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      companyOrderNumber: order.companyOrderNumber,
      status: order.status,
      statusLabel: statusLabels[order.status] || 'Unknown',
      companyId: order.companyId,
      companyName: order.company?.name || null,
      items: (order.items || []).map((item) => this.mapOrderItemToDto(item)),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      createdBy: order.createdByFirebaseUid,
      updatedBy: order.updatedByFirebaseUid,
      statusHistory: order.statusHistory || [],
    };
  }

  /**
   * Maps an order item entity to DTO, calculating weight values.
   *
   * Weight Calculation:
   * - kgPerRoll = thickness(mm) × (width(mm) / 1000) × length(m) × specificGravity
   * - totalKg = kgPerRoll × quantity
   *
   * @param item - Order item entity with optional product relation
   * @returns DTO with calculated kgPerRoll and totalKg
   */
  private mapOrderItemToDto(item: RubberOrderItem): RubberOrderItemDto {
    const thickness = Number(item.thickness) || 0;
    const width = Number(item.width) || 0;
    const length = Number(item.length) || 0;
    const quantity = Number(item.quantity) || 0;
    const specificGravity = item.product
      ? Number(item.product.specificGravity) || 1
      : 1;

    const kgPerRoll =
      thickness && width && length
        ? thickness * (width / 1000) * length * specificGravity
        : null;
    const totalKg = kgPerRoll && quantity ? kgPerRoll * quantity : null;

    return {
      id: item.id,
      productId: item.productId,
      productTitle: item.product?.title || null,
      thickness: thickness || null,
      width: width || null,
      length: length || null,
      quantity: quantity || null,
      callOffs: item.callOffs,
      kgPerRoll,
      totalKg,
    };
  }
}
