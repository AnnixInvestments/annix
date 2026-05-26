import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { RfqDocument } from "./entities/rfq-document.entity";
import { RfqDocumentRepository } from "./rfq-document.repository";

@Injectable()
export class MongoRfqDocumentRepository
  extends MongoCrudRepository<RfqDocument>
  implements RfqDocumentRepository
{
  constructor(@InjectModel("RfqDocument") model: Model<RfqDocument>) {
    super(model);
  }

  async findByRfqIdWithUploadedBy(rfqId: number): Promise<RfqDocument[]> {
    const documents = await this.documents
      .find({ rfqId })
      .populate("uploadedBy")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByIdWithRfqAndUploadedBy(documentId: number): Promise<RfqDocument | null> {
    const document = await this.documents
      .findById(documentId)
      .populate(["rfq", "uploadedBy"])
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByIdWithRfqCreatedBy(documentId: number): Promise<RfqDocument | null> {
    const document = await this.documents
      .findById(documentId)
      .populate({ path: "rfq", populate: { path: "createdBy" } })
      .lean()
      .exec();
    return this.toDomain(document);
  }
}
