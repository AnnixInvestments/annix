import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BookingLinkRepository } from "./booking-link.repository";
import { BookingLink } from "./entities/booking-link.entity";

@Injectable()
export class MongoBookingLinkRepository
  extends MongoCrudRepository<BookingLink>
  implements BookingLinkRepository
{
  constructor(@InjectModel("BookingLink") model: Model<BookingLink>) {
    super(model);
  }

  async findByIdAndUser(id: number, userId: number): Promise<BookingLink | null> {
    const doc = await this.documents.findOne({ _id: id, userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByUser(userId: number): Promise<BookingLink[]> {
    const docs = await this.documents.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveBySlug(slug: string): Promise<BookingLink | null> {
    const doc = await this.documents.findOne({ slug, isActive: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findActiveBySlugWithUser(slug: string): Promise<BookingLink | null> {
    const doc = await this.documents
      .findOne({ slug, isActive: true })
      .populate("user")
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
