import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CompoundDataSheet } from "../entities/compound-data-sheet.entity";
import { CompoundDataSheetRepository } from "./compound-data-sheet.repository";

@Injectable()
export class MongoCompoundDataSheetRepository
  extends MongoCrudRepository<CompoundDataSheet>
  implements CompoundDataSheetRepository
{
  constructor(@InjectModel("CompoundDataSheet") model: Model<CompoundDataSheet>) {
    super(model);
  }

  async findPublishedOrdered(): Promise<CompoundDataSheet[]> {
    const docs = await this.documents
      .find({ isPublished: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOnePublishedBySlug(slug: string): Promise<CompoundDataSheet | null> {
    const doc = await this.documents.findOne({ slug, isPublished: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllOrdered(): Promise<CompoundDataSheet[]> {
    const docs = await this.documents.find().sort({ sortOrder: 1, name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneBySlug(slug: string): Promise<CompoundDataSheet | null> {
    const doc = await this.documents.findOne({ slug }).lean().exec();
    return this.toDomain(doc);
  }

  build(data: Partial<CompoundDataSheet>): CompoundDataSheet {
    return data as CompoundDataSheet;
  }
}
