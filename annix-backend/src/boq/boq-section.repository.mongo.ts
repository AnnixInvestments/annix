import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BoqSectionRepository } from "./boq-section.repository";
import { BoqSection } from "./entities/boq-section.entity";

@Injectable()
export class MongoBoqSectionRepository
  extends MongoCrudRepository<BoqSection>
  implements BoqSectionRepository
{
  constructor(@InjectModel("BoqSection") model: Model<BoqSection>) {
    super(model);
  }

  async deleteByBoqId(boqId: number): Promise<void> {
    await this.documents.deleteMany({ boqId }).exec();
  }

  async findByBoqId(boqId: number): Promise<BoqSection[]> {
    const docs = await this.documents.find({ boqId }).sort({ _id: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByBoqIdAndSectionTypes(boqId: number, sectionTypes: string[]): Promise<BoqSection[]> {
    const docs = await this.documents
      .find({ boqId, sectionType: { $in: sectionTypes } })
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByBoqIds(boqIds: number[]): Promise<BoqSection[]> {
    const docs = await this.documents
      .find({ boqId: { $in: boqIds } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByBoqIdsAndSectionTypes(
    boqIds: number[],
    sectionTypes: string[],
  ): Promise<BoqSection[]> {
    const docs = await this.documents
      .find({ boqId: { $in: boqIds }, sectionType: { $in: sectionTypes } })
      .select("boqId sectionType")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
