import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  CoatingEnvironmentRepository,
  CoatingSpecificationRepository,
  CoatingStandardRepository,
} from "./coating-specification.repository";
import { CoatingEnvironment } from "./entities/coating-environment.entity";
import { CoatingSpecification } from "./entities/coating-specification.entity";
import { CoatingStandard } from "./entities/coating-standard.entity";

@Injectable()
export class PostgresCoatingStandardRepository
  extends TypeOrmCrudRepository<CoatingStandard>
  implements CoatingStandardRepository
{
  constructor(@InjectRepository(CoatingStandard) repository: Repository<CoatingStandard>) {
    super(repository);
  }

  async findAllOrderedByCode(): Promise<CoatingStandard[]> {
    return this.repository.find({
      order: { code: "ASC" },
    });
  }

  async findByCodeWithRelations(code: string): Promise<CoatingStandard | null> {
    return this.repository.findOne({
      where: { code },
      relations: ["environments", "environments.specifications"],
    });
  }

  async findByCode(code: string): Promise<CoatingStandard | null> {
    return this.repository.findOne({
      where: { code },
    });
  }
}

@Injectable()
export class PostgresCoatingEnvironmentRepository
  extends TypeOrmCrudRepository<CoatingEnvironment>
  implements CoatingEnvironmentRepository
{
  constructor(@InjectRepository(CoatingEnvironment) repository: Repository<CoatingEnvironment>) {
    super(repository);
  }

  async findAllWithStandard(): Promise<CoatingEnvironment[]> {
    return this.repository.find({
      relations: ["standard"],
      order: { standardId: "ASC", category: "ASC" },
    });
  }

  async findByStandardCode(standardCode: string): Promise<CoatingEnvironment[]> {
    return this.repository.find({
      where: { standard: { code: standardCode } },
      relations: ["standard"],
      order: { category: "ASC" },
    });
  }

  async findByCategoryWithRelations(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    return this.repository.findOne({
      where: {
        standard: { code: standardCode },
        category,
      },
      relations: ["standard", "specifications"],
    });
  }

  async findByStandardCodeAndCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    return this.repository.findOne({
      where: {
        standard: { code: standardCode },
        category,
      },
      relations: ["standard"],
    });
  }

  async findByStandardAndCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    return this.repository.findOne({
      where: {
        standard: { code: standardCode },
        category,
      },
    });
  }

  async findAllForStandardCode(standardCode: string): Promise<CoatingEnvironment[]> {
    return this.repository.find({
      where: { standard: { code: standardCode } },
      order: { category: "ASC" },
    });
  }
}

@Injectable()
export class PostgresCoatingSpecificationRepository
  extends TypeOrmCrudRepository<CoatingSpecification>
  implements CoatingSpecificationRepository
{
  constructor(
    @InjectRepository(CoatingSpecification) repository: Repository<CoatingSpecification>,
  ) {
    super(repository);
  }

  async findByEnvironmentId(environmentId: number): Promise<CoatingSpecification[]> {
    return this.repository.find({
      where: { environmentId },
      order: { coatingType: "ASC", lifespan: "ASC" },
    });
  }

  async findByEnvironmentAndType(
    environmentId: number,
    coatingType: string,
    lifespan?: string,
  ): Promise<CoatingSpecification[]> {
    const whereClause: any = { environmentId, coatingType };
    if (lifespan) {
      whereClause.lifespan = lifespan;
    }
    return this.repository.find({
      where: whereClause,
      relations: ["environment", "environment.standard"],
      order: { lifespan: "ASC" },
    });
  }

  async findByEnvironmentAndExternalType(environmentId: number): Promise<CoatingSpecification[]> {
    return this.repository.find({
      where: { environmentId, coatingType: "external" },
      order: { lifespan: "ASC" },
    });
  }

  async findByEnvironmentAndInternalType(environmentId: number): Promise<CoatingSpecification[]> {
    return this.repository.find({
      where: { environmentId, coatingType: "internal" },
      order: { lifespan: "ASC" },
    });
  }

  async findBySystemCode(systemCode: string): Promise<CoatingSpecification | null> {
    return this.repository.findOne({
      where: { systemCode },
      relations: ["environment", "environment.standard"],
    });
  }
}
