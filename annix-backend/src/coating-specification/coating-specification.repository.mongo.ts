import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  CoatingEnvironmentRepository,
  CoatingSpecificationRepository,
  CoatingStandardRepository,
} from "./coating-specification.repository";
import { CoatingEnvironment } from "./entities/coating-environment.entity";
import { CoatingSpecification } from "./entities/coating-specification.entity";
import { CoatingStandard } from "./entities/coating-standard.entity";

type MongoDoc = Record<string, unknown>;

@Injectable()
export class MongoCoatingStandardRepository
  extends MongoCrudRepository<CoatingStandard>
  implements CoatingStandardRepository
{
  constructor(@InjectModel("CoatingStandard") model: Model<CoatingStandard>) {
    super(model);
  }

  async findAllOrderedByCode(): Promise<CoatingStandard[]> {
    return this.toDomainList(await this.documents.find().sort({ code: 1 }).lean().exec());
  }

  async findByCodeWithRelations(code: string): Promise<CoatingStandard | null> {
    return this.toDomain(await this.documents.findOne({ code }).lean().exec());
  }

  async findByCode(code: string): Promise<CoatingStandard | null> {
    return this.toDomain(await this.documents.findOne({ code }).lean().exec());
  }
}

@Injectable()
export class MongoCoatingEnvironmentRepository
  extends MongoCrudRepository<CoatingEnvironment>
  implements CoatingEnvironmentRepository
{
  constructor(@InjectModel("CoatingEnvironment") model: Model<CoatingEnvironment>) {
    super(model);
  }

  private get standardModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("CoatingStandard");
  }

  private async standardIdByCode(code: string): Promise<unknown | null> {
    const doc = await this.standardModel.findOne({ code }).lean().exec();
    return doc ? doc._id : null;
  }

  async findAllWithStandard(): Promise<CoatingEnvironment[]> {
    return this.toDomainList(
      await this.documents.find().sort({ standardId: 1, category: 1 }).lean().exec(),
    );
  }

  async findByStandardCode(standardCode: string): Promise<CoatingEnvironment[]> {
    const standardId = await this.standardIdByCode(standardCode);
    if (standardId === null) {
      return [];
    }
    return this.toDomainList(
      await this.documents.find({ standardId }).sort({ category: 1 }).lean().exec(),
    );
  }

  async findByCategoryWithRelations(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    const standardId = await this.standardIdByCode(standardCode);
    if (standardId === null) {
      return null;
    }
    return this.toDomain(await this.documents.findOne({ standardId, category }).lean().exec());
  }

  async findByStandardCodeAndCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    const standardId = await this.standardIdByCode(standardCode);
    if (standardId === null) {
      return null;
    }
    return this.toDomain(await this.documents.findOne({ standardId, category }).lean().exec());
  }

  async findByStandardAndCategory(
    standardCode: string,
    category: string,
  ): Promise<CoatingEnvironment | null> {
    const standardId = await this.standardIdByCode(standardCode);
    if (standardId === null) {
      return null;
    }
    return this.toDomain(await this.documents.findOne({ standardId, category }).lean().exec());
  }

  async findAllForStandardCode(standardCode: string): Promise<CoatingEnvironment[]> {
    const standardId = await this.standardIdByCode(standardCode);
    if (standardId === null) {
      return [];
    }
    return this.toDomainList(
      await this.documents.find({ standardId }).sort({ category: 1 }).lean().exec(),
    );
  }
}

@Injectable()
export class MongoCoatingSpecificationRepository
  extends MongoCrudRepository<CoatingSpecification>
  implements CoatingSpecificationRepository
{
  constructor(@InjectModel("CoatingSpecification") model: Model<CoatingSpecification>) {
    super(model);
  }

  async findByEnvironmentId(environmentId: number): Promise<CoatingSpecification[]> {
    return this.toDomainList(
      await this.documents
        .find({ environmentId })
        .sort({ coatingType: 1, lifespan: 1 })
        .lean()
        .exec(),
    );
  }

  async findByEnvironmentAndType(
    environmentId: number,
    coatingType: string,
    lifespan?: string,
  ): Promise<CoatingSpecification[]> {
    const filter: Record<string, unknown> = { environmentId, coatingType };
    if (lifespan) {
      filter.lifespan = lifespan;
    }
    return this.toDomainList(await this.documents.find(filter).sort({ lifespan: 1 }).lean().exec());
  }

  async findByEnvironmentAndExternalType(environmentId: number): Promise<CoatingSpecification[]> {
    return this.toDomainList(
      await this.documents
        .find({ environmentId, coatingType: "external" })
        .sort({ lifespan: 1 })
        .lean()
        .exec(),
    );
  }

  async findByEnvironmentAndInternalType(environmentId: number): Promise<CoatingSpecification[]> {
    return this.toDomainList(
      await this.documents
        .find({ environmentId, coatingType: "internal" })
        .sort({ lifespan: 1 })
        .lean()
        .exec(),
    );
  }

  async findBySystemCode(systemCode: string): Promise<CoatingSpecification | null> {
    return this.toDomain(await this.documents.findOne({ systemCode }).lean().exec());
  }
}
