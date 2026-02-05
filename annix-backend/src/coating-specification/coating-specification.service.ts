import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoatingStandard } from './entities/coating-standard.entity';
import { CoatingEnvironment } from './entities/coating-environment.entity';
import { CoatingSpecification } from './entities/coating-specification.entity';

@Injectable()
export class CoatingSpecificationService {
  constructor(
    @InjectRepository(CoatingStandard)
    private readonly standardRepo: Repository<CoatingStandard>,
    @InjectRepository(CoatingEnvironment)
    private readonly environmentRepo: Repository<CoatingEnvironment>,
    @InjectRepository(CoatingSpecification)
    private readonly specificationRepo: Repository<CoatingSpecification>,
  ) {}

  async findAllStandards(): Promise<CoatingStandard[]> {
    return this.standardRepo.find({
      order: { code: 'ASC' },
    });
  }

  async findStandardByCode(code: string): Promise<CoatingStandard | null> {
    return this.standardRepo.findOne({
      where: { code },
      relations: ['environments', 'environments.specifications'],
    });
  }

  async findAllEnvironments(): Promise<CoatingEnvironment[]> {
    return this.environmentRepo.find({
      relations: ['standard'],
      order: { standardId: 'ASC', category: 'ASC' },
    });
  }

  async findEnvironmentsByStandard(
    standardCode: string,
  ): Promise<CoatingEnvironment[]> {
    return this.environmentRepo.find({
      where: { standard: { code: standardCode } },
      relations: ['standard'],
      order: { category: 'ASC' },
    });
  }

  async findEnvironmentByCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    return this.environmentRepo.findOne({
      where: {
        standard: { code: standardCode },
        category,
      },
      relations: ['standard', 'specifications'],
    });
  }

  async findSpecificationsByEnvironment(
    environmentId: number,
  ): Promise<CoatingSpecification[]> {
    return this.specificationRepo.find({
      where: { environmentId },
      order: { coatingType: 'ASC', lifespan: 'ASC' },
    });
  }

  /**
   * Get recommended coating specifications for a given environment and type
   */
  async getRecommendedCoatings(
    standardCode: string,
    category: string,
    coatingType: 'external' | 'internal',
    lifespan?: string,
  ): Promise<CoatingSpecification[]> {
    const environment = await this.environmentRepo.findOne({
      where: {
        standard: { code: standardCode },
        category,
      },
      relations: ['standard'],
    });

    if (!environment) {
      return [];
    }

    const whereClause: any = {
      environmentId: environment.id,
      coatingType,
    };

    if (lifespan) {
      whereClause.lifespan = lifespan;
    }

    return this.specificationRepo.find({
      where: whereClause,
      relations: ['environment', 'environment.standard'],
      order: { lifespan: 'ASC' },
    });
  }

  /**
   * Get complete coating information for a category
   */
  async getCompleteCoatingInfo(
    standardCode: string,
    category: string,
  ): Promise<{
    standard: CoatingStandard | null;
    environment: CoatingEnvironment | null;
    externalSpecs: CoatingSpecification[];
    internalSpecs: CoatingSpecification[];
  }> {
    const standard = await this.standardRepo.findOne({
      where: { code: standardCode },
    });

    const environment = await this.environmentRepo.findOne({
      where: {
        standard: { code: standardCode },
        category,
      },
      relations: ['standard'],
    });

    if (!environment) {
      return {
        standard,
        environment: null,
        externalSpecs: [],
        internalSpecs: [],
      };
    }

    const [externalSpecs, internalSpecs] = await Promise.all([
      this.specificationRepo.find({
        where: { environmentId: environment.id, coatingType: 'external' },
        order: { lifespan: 'ASC' },
      }),
      this.specificationRepo.find({
        where: { environmentId: environment.id, coatingType: 'internal' },
        order: { lifespan: 'ASC' },
      }),
    ]);

    return {
      standard,
      environment,
      externalSpecs,
      internalSpecs,
    };
  }

  /**
   * Get all available lifespan options
   */
  getLifespanOptions(): { value: string; label: string; years: string }[] {
    return [
      { value: 'Low', label: 'Low', years: '2-7 years' },
      { value: 'Medium', label: 'Medium', years: '7-15 years' },
      { value: 'High', label: 'High', years: '15-25 years' },
      { value: 'Very High', label: 'Very High', years: '>25 years' },
    ];
  }

  /**
   * Get all corrosivity categories for ISO 12944
   */
  async getCorrosivityCategories(): Promise<
    { category: string; description: string }[]
  > {
    const environments = await this.environmentRepo.find({
      where: { standard: { code: 'ISO 12944' } },
      order: { category: 'ASC' },
    });

    return environments.map((env) => ({
      category: env.category,
      description: env.description,
    }));
  }

  /**
   * Get paint systems filtered by category and durability (ISO 12944-5:2018)
   * Returns the LOWEST (simplest) spec that meets the durability requirement
   * Sorted by minimum DFT to recommend the most economical option
   */
  async systemsByDurability(
    category: string,
    durability: 'L' | 'M' | 'H' | 'VH',
  ): Promise<{
    recommended: CoatingSpecification | null;
    alternatives: CoatingSpecification[];
  }> {
    const environment = await this.environmentRepo.findOne({
      where: {
        standard: { code: 'ISO 12944' },
        category,
      },
    });

    if (!environment) {
      return { recommended: null, alternatives: [] };
    }

    const allSpecs = await this.specificationRepo.find({
      where: {
        environmentId: environment.id,
        coatingType: 'external',
      },
      relations: ['environment', 'environment.standard'],
    });

    const matchingSpecs = allSpecs.filter((spec) => {
      const durabilities = spec.supportedDurabilities?.split(',') || [];
      return durabilities.includes(durability);
    });

    const parseMinDft = (dftRange: string): number => {
      const match = dftRange.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 9999;
    };

    matchingSpecs.sort((a, b) => {
      const minDftA = parseMinDft(a.totalDftUmRange);
      const minDftB = parseMinDft(b.totalDftUmRange);
      return minDftA - minDftB;
    });

    const recommended = matchingSpecs[0] || null;
    const alternatives = matchingSpecs.slice(1);

    return { recommended, alternatives };
  }

  /**
   * Get all paint systems for a category (ISO 12944-5:2018)
   */
  async systemsByCategory(category: string): Promise<CoatingSpecification[]> {
    const environment = await this.environmentRepo.findOne({
      where: {
        standard: { code: 'ISO 12944' },
        category,
      },
    });

    if (!environment) {
      return [];
    }

    return this.specificationRepo.find({
      where: {
        environmentId: environment.id,
        coatingType: 'external',
      },
      relations: ['environment', 'environment.standard'],
      order: { systemCode: 'ASC' },
    });
  }

  /**
   * Get available durability options for a category
   */
  async availableDurabilitiesForCategory(
    category: string,
  ): Promise<{ code: string; label: string; years: string }[]> {
    const specs = await this.systemsByCategory(category);

    const durabilitySet = new Set<string>();
    for (const spec of specs) {
      const durabilities = spec.supportedDurabilities?.split(',') || [];
      for (const d of durabilities) {
        durabilitySet.add(d);
      }
    }

    const durabilityMap: { [key: string]: { label: string; years: string } } = {
      L: { label: 'Low', years: '2-7 years' },
      M: { label: 'Medium', years: '7-15 years' },
      H: { label: 'High', years: '15-25 years' },
      VH: { label: 'Very High', years: '>25 years' },
    };

    const orderedCodes = ['L', 'M', 'H', 'VH'];
    return orderedCodes
      .filter((code) => durabilitySet.has(code))
      .map((code) => ({
        code,
        label: durabilityMap[code].label,
        years: durabilityMap[code].years,
      }));
  }

  /**
   * Get a specific paint system by its ISO code
   */
  async systemByCode(systemCode: string): Promise<CoatingSpecification | null> {
    return this.specificationRepo.findOne({
      where: { systemCode },
      relations: ['environment', 'environment.standard'],
    });
  }
}
