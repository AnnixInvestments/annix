import { Injectable } from "@nestjs/common";
import {
  CoatingEnvironmentRepository,
  CoatingSpecificationRepository,
  CoatingStandardRepository,
} from "./coating-specification.repository";
import { CoatingEnvironment } from "./entities/coating-environment.entity";
import { CoatingSpecification } from "./entities/coating-specification.entity";
import { CoatingStandard } from "./entities/coating-standard.entity";

@Injectable()
export class CoatingSpecificationService {
  constructor(
    private readonly standardRepository: CoatingStandardRepository,
    private readonly environmentRepository: CoatingEnvironmentRepository,
    private readonly specificationRepository: CoatingSpecificationRepository,
  ) {}

  async findAllStandards(): Promise<CoatingStandard[]> {
    return this.standardRepository.findAllOrderedByCode();
  }

  async findStandardByCode(code: string): Promise<CoatingStandard | null> {
    return this.standardRepository.findByCodeWithRelations(code);
  }

  async findAllEnvironments(): Promise<CoatingEnvironment[]> {
    return this.environmentRepository.findAllWithStandard();
  }

  async findEnvironmentsByStandard(standardCode: string): Promise<CoatingEnvironment[]> {
    return this.environmentRepository.findByStandardCode(standardCode);
  }

  async findEnvironmentByCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    return this.environmentRepository.findByCategoryWithRelations(standardCode, category);
  }

  async findSpecificationsByEnvironment(environmentId: number): Promise<CoatingSpecification[]> {
    return this.specificationRepository.findByEnvironmentId(environmentId);
  }

  async getRecommendedCoatings(
    standardCode: string,
    category: string,
    coatingType: "external" | "internal",
    lifespan?: string,
  ): Promise<CoatingSpecification[]> {
    const environment = await this.environmentRepository.findByStandardCodeAndCategory(
      standardCode,
      category,
    );

    if (!environment) {
      return [];
    }

    return this.specificationRepository.findByEnvironmentAndType(
      environment.id,
      coatingType,
      lifespan,
    );
  }

  async getCompleteCoatingInfo(
    standardCode: string,
    category: string,
  ): Promise<{
    standard: CoatingStandard | null;
    environment: CoatingEnvironment | null;
    externalSpecs: CoatingSpecification[];
    internalSpecs: CoatingSpecification[];
  }> {
    const standard = await this.standardRepository.findByCode(standardCode);

    const environment = await this.environmentRepository.findByStandardCodeAndCategory(
      standardCode,
      category,
    );

    if (!environment) {
      return {
        standard,
        environment: null,
        externalSpecs: [],
        internalSpecs: [],
      };
    }

    const [externalSpecs, internalSpecs] = await Promise.all([
      this.specificationRepository.findByEnvironmentAndExternalType(environment.id),
      this.specificationRepository.findByEnvironmentAndInternalType(environment.id),
    ]);

    return {
      standard,
      environment,
      externalSpecs,
      internalSpecs,
    };
  }

  getLifespanOptions(): { value: string; label: string; years: string }[] {
    return [
      { value: "Low", label: "Low", years: "2-7 years" },
      { value: "Medium", label: "Medium", years: "7-15 years" },
      { value: "High", label: "High", years: "15-25 years" },
      { value: "Very High", label: "Very High", years: ">25 years" },
    ];
  }

  async getCorrosivityCategories(): Promise<{ category: string; description: string }[]> {
    const environments = await this.environmentRepository.findAllForStandardCode("ISO 12944");

    return environments.map((env) => ({
      category: env.category,
      description: env.description,
    }));
  }

  async systemsByDurability(
    category: string,
    durability: "L" | "M" | "H" | "VH",
  ): Promise<{
    recommended: CoatingSpecification | null;
    alternatives: CoatingSpecification[];
  }> {
    const environment = await this.environmentRepository.findByStandardAndCategory(
      "ISO 12944",
      category,
    );

    if (!environment) {
      return { recommended: null, alternatives: [] };
    }

    const allSpecs = await this.specificationRepository.findByEnvironmentAndExternalType(
      environment.id,
    );

    const matchingSpecs = allSpecs.filter((spec) => {
      const durabilities = spec.supportedDurabilities?.split(",") || [];
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

  async systemsByCategory(category: string): Promise<CoatingSpecification[]> {
    const environment = await this.environmentRepository.findByStandardAndCategory(
      "ISO 12944",
      category,
    );

    if (!environment) {
      return [];
    }

    return this.specificationRepository.findByEnvironmentAndExternalType(environment.id);
  }

  async availableDurabilitiesForCategory(
    category: string,
  ): Promise<{ code: string; label: string; years: string }[]> {
    const specs = await this.systemsByCategory(category);

    const durabilitySet = new Set<string>();
    for (const spec of specs) {
      const durabilities = spec.supportedDurabilities?.split(",") || [];
      for (const d of durabilities) {
        durabilitySet.add(d);
      }
    }

    const durabilityMap: { [key: string]: { label: string; years: string } } = {
      L: { label: "Low", years: "2-7 years" },
      M: { label: "Medium", years: "7-15 years" },
      H: { label: "High", years: "15-25 years" },
      VH: { label: "Very High", years: ">25 years" },
    };

    const orderedCodes = ["L", "M", "H", "VH"];
    return orderedCodes
      .filter((code) => durabilitySet.has(code))
      .map((code) => ({
        code,
        label: durabilityMap[code].label,
        years: durabilityMap[code].years,
      }));
  }

  async systemByCode(systemCode: string): Promise<CoatingSpecification | null> {
    return this.specificationRepository.findBySystemCode(systemCode);
  }
}
