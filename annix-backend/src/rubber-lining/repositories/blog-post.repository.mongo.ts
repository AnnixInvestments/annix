import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { BlogPost } from "../entities/blog-post.entity";
import { BlogPostRepository } from "./blog-post.repository";

@Injectable()
export class MongoBlogPostRepository
  extends MongoCrudRepository<BlogPost>
  implements BlogPostRepository
{
  constructor(@InjectModel("BlogPost") model: Model<BlogPost>) {
    super(model);
  }

  async findPublishedOrdered(): Promise<BlogPost[]> {
    const docs = await this.documents
      .find({ isPublished: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOnePublishedBySlug(slug: string): Promise<BlogPost | null> {
    const doc = await this.documents.findOne({ slug, isPublished: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllOrdered(): Promise<BlogPost[]> {
    const docs = await this.documents.find().sort({ publishedAt: -1, createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneBySlug(slug: string): Promise<BlogPost | null> {
    const doc = await this.documents.findOne({ slug }).lean().exec();
    return this.toDomain(doc);
  }

  build(data: Partial<BlogPost>): BlogPost {
    return data as BlogPost;
  }
}
