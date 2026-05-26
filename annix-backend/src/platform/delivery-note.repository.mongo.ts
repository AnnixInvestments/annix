import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { DeliveryNoteRepository } from "./delivery-note.repository";
import type { DeliveryNotePage } from "./delivery-note.service";
import type { DeliveryNoteFilterDto } from "./dto/delivery-note.dto";
import { PlatformDeliveryNote } from "./entities/delivery-note.entity";

@Injectable()
export class MongoDeliveryNoteRepository
  extends MongoCrudRepository<PlatformDeliveryNote>
  implements DeliveryNoteRepository
{
  constructor(@InjectModel("PlatformDeliveryNote") model: Model<PlatformDeliveryNote>) {
    super(model);
  }

  async search(companyId: number, filters: DeliveryNoteFilterDto): Promise<DeliveryNotePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { companyId, versionStatus: "ACTIVE" };

    if (filters.sourceModule) {
      query.sourceModule = filters.sourceModule;
    }
    if (filters.deliveryNoteType) {
      query.deliveryNoteType = filters.deliveryNoteType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.supplierContactId) {
      query.supplierContactId = filters.supplierContactId;
    }
    if (filters.search) {
      const re = new RegExp(filters.search, "i");
      query.$or = [{ deliveryNumber: re }, { supplierName: re }, { customerReference: re }];
    }

    const [documents, total] = await Promise.all([
      this.documents.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { data: this.toDomainList(documents), total, page, limit };
  }

  async findByCompanyAndId(
    companyId: number,
    id: number,
    _relations: string[] = [],
  ): Promise<PlatformDeliveryNote | null> {
    const document = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findByLegacyScId(id: number): Promise<PlatformDeliveryNote | null> {
    const document = await this.documents.findOne({ legacyScDeliveryNoteId: id }).lean().exec();
    return this.toDomain(document);
  }

  async findByLegacyRubberId(id: number): Promise<PlatformDeliveryNote | null> {
    const document = await this.documents.findOne({ legacyRubberDeliveryNoteId: id }).lean().exec();
    return this.toDomain(document);
  }
}
