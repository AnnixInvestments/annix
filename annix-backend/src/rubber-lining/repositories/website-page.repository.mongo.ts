import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { WebsitePage } from "../entities/website-page.entity";
import { WebsitePageRepository } from "./website-page.repository";

@Injectable()
export class MongoWebsitePageRepository
  extends MongoCrudRepository<WebsitePage>
  implements WebsitePageRepository
{
  constructor(@InjectModel("WebsitePage") model: Model<WebsitePage>) {
    super(model);
  }

  build(data: Partial<WebsitePage>): WebsitePage {
    return data as WebsitePage;
  }

  async findPublishedOrdered(): Promise<WebsitePage[]> {
    const docs = await this.documents
      .find({ isPublished: true })
      .sort({ sortOrder: 1, title: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOnePublishedBySlug(slug: string): Promise<WebsitePage | null> {
    const doc = await this.documents.findOne({ slug, isPublished: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneHomePagePublished(): Promise<WebsitePage | null> {
    const doc = await this.documents.findOne({ isHomePage: true, isPublished: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllOrdered(): Promise<WebsitePage[]> {
    const docs = await this.documents.find().sort({ sortOrder: 1, title: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneBySlug(slug: string): Promise<WebsitePage | null> {
    const doc = await this.documents.findOne({ slug }).lean().exec();
    return this.toDomain(doc);
  }

  async clearHomePage(): Promise<void> {
    await this.documents.updateMany({ isHomePage: true }, { $set: { isHomePage: false } }).exec();
  }
}
