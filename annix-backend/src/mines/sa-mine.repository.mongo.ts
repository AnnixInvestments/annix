import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SaMine } from "./entities/sa-mine.entity";
import { SaMineFilters, SaMineRepository } from "./sa-mine.repository";

@Injectable()
export class MongoSaMineRepository extends MongoCrudRepository<SaMine> implements SaMineRepository {
  constructor(@InjectModel("SaMine") model: Model<SaMine>) {
    super(model);
  }

  async findFiltered(filters: SaMineFilters): Promise<SaMine[]> {
    const query: Record<string, unknown> = {};

    if (filters.commodityId) {
      query.commodityId = filters.commodityId;
    }

    if (filters.province) {
      query.province = filters.province;
    }

    if (filters.status) {
      query.operationalStatus = filters.status;
    }

    const documents = await this.documents.find(query).sort({ mineName: 1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findByIdWithCommodity(id: number): Promise<SaMine | null> {
    const document = await this.documents.findOne({ id }).lean().exec();
    return this.toDomain(document);
  }

  async distinctProvinces(): Promise<string[]> {
    const provinces = await this.documents.distinct("province").exec();
    return (provinces as string[]).sort();
  }

  async createMine(data: Partial<SaMine>): Promise<SaMine> {
    const document = await this.documents.create(data);
    return this.toDomain(document.toObject()) as SaMine;
  }

  async findCreatedMine(id: number): Promise<SaMine> {
    const document = await this.documents.findOne({ id }).lean().exec();
    return this.toDomain(document) as SaMine;
  }

  async findByIds(ids: number[]): Promise<SaMine[]> {
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async searchByName(query: string | null): Promise<SaMine[]> {
    const filter: Record<string, unknown> = {};
    if (query) {
      const regex = { $regex: escapeRegExp(query), $options: "i" };
      filter.$or = [{ mineName: regex }, { operatingCompany: regex }];
    }
    const documents = await this.documents
      .find(filter)
      .sort({ mineName: 1 })
      .limit(50)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByNameAndCompany(mineName: string, operatingCompany: string): Promise<SaMine | null> {
    const document = await this.documents
      .findOne({
        mineName: { $regex: `^${escapeRegExp(mineName)}$`, $options: "i" },
        operatingCompany: { $regex: `^${escapeRegExp(operatingCompany)}$`, $options: "i" },
      })
      .lean()
      .exec();
    return this.toDomain(document);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
