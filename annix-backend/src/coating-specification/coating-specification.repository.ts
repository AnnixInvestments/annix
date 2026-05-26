import { CrudRepository } from "../lib/persistence/crud-repository";
import { CoatingEnvironment } from "./entities/coating-environment.entity";
import { CoatingSpecification } from "./entities/coating-specification.entity";
import { CoatingStandard } from "./entities/coating-standard.entity";

export abstract class CoatingStandardRepository extends CrudRepository<CoatingStandard> {
  abstract findAllOrderedByCode(): Promise<CoatingStandard[]>;
  abstract findByCodeWithRelations(code: string): Promise<CoatingStandard | null>;
  abstract findByCode(code: string): Promise<CoatingStandard | null>;
}

export abstract class CoatingEnvironmentRepository extends CrudRepository<CoatingEnvironment> {
  abstract findAllWithStandard(): Promise<CoatingEnvironment[]>;
  abstract findByStandardCode(standardCode: string): Promise<CoatingEnvironment[]>;
  abstract findByCategoryWithRelations(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null>;
  abstract findByStandardCodeAndCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null>;
  abstract findByStandardAndCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null>;
  abstract findAllForStandardCode(standardCode: string): Promise<CoatingEnvironment[]>;
}

export abstract class CoatingSpecificationRepository extends CrudRepository<CoatingSpecification> {
  abstract findByEnvironmentId(environmentId: number): Promise<CoatingSpecification[]>;
  abstract findByEnvironmentAndType(
    environmentId: number,
    coatingType: string,
    lifespan?: string,
  ): Promise<CoatingSpecification[]>;
  abstract findByEnvironmentAndExternalType(environmentId: number): Promise<CoatingSpecification[]>;
  abstract findByEnvironmentAndInternalType(environmentId: number): Promise<CoatingSpecification[]>;
  abstract findBySystemCode(systemCode: string): Promise<CoatingSpecification | null>;
}
