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
    private readonly standardRepository: Repository<CoatingStandard>,
    @InjectRepository(CoatingEnvironment)
    private readonly environmentRepository: Repository<CoatingEnvironment>,
    @InjectRepository(CoatingSpecification)
    private readonly specificationRepository: Repository<CoatingSpecification>,
  ) {}

  async findAllStandards(): Promise<CoatingStandard[]> {
    return this.standardRepository.find({
      order: { code: 'ASC' },
    });
  }

  async findStandardByCode(code: string): Promise<CoatingStandard | null> {
    return this.standardRepository.findOne({
      where: { code },
      relations: ['environments', 'environments.specifications'],
    });
  }

  async findAllEnvironments(): Promise<CoatingEnvironment[]> {
    return this.environmentRepository.find({
      relations: ['standard'],
      order: { standardId: 'ASC', category: 'ASC' },
    });
  }

  async findEnvironmentsByStandard(standardCode: string): Promise<CoatingEnvironment[]> {
    return this.environmentRepository.find({
      where: { standard: { code: standardCode } },
      relations: ['standard'],
      order: { category: 'ASC' },
    });
  }

  async findEnvironmentByCategory(standardCode: string, category: string): Promise<CoatingEnvironment | null> {
    return this.environmentRepository.findOne({
      where: {
        standard: { code: standardCode },
        category
      },
      relations: ['standard', 'specifications'],
    });
  }

  async findSpecificationsByEnvironment(environmentId: number): Promise<CoatingSpecification[]> {
    return this.specificationRepository.find({
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
    const environment = await this.environmentRepository.findOne({
      where: {
        standard: { code: standardCode },
        category
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

    return this.specificationRepository.find({
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
    const standard = await this.standardRepository.findOne({
      where: { code: standardCode },
    });

    const environment = await this.environmentRepository.findOne({
      where: {
        standard: { code: standardCode },
        category
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
      this.specificationRepository.find({
        where: { environmentId: environment.id, coatingType: 'external' },
        order: { lifespan: 'ASC' },
      }),
      this.specificationRepository.find({
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
  async getCorrosivityCategories(): Promise<{ category: string; description: string }[]> {
    const environments = await this.environmentRepository.find({
      where: { standard: { code: 'ISO 12944' } },
      order: { category: 'ASC' },
    });

    return environments.map(env => ({
      category: env.category,
      description: env.description,
    }));
  }
}
