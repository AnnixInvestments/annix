import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { Testimonial } from "../entities/testimonial.entity";
import { TestimonialRepository } from "./testimonial.repository";

@Injectable()
export class MongoTestimonialRepository
  extends MongoCrudRepository<Testimonial>
  implements TestimonialRepository
{
  constructor(@InjectModel("Testimonial") model: Model<Testimonial>) {
    super(model);
  }

  build(data: Partial<Testimonial>): Testimonial {
    return data as Testimonial;
  }

  async findPublishedOrdered(): Promise<Testimonial[]> {
    const docs = await this.documents
      .find({ isPublished: true })
      .sort({ sortOrder: 1, datePublished: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllOrdered(): Promise<Testimonial[]> {
    const docs = await this.documents
      .find()
      .sort({ sortOrder: 1, datePublished: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
