import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcReleaseCertificate } from "../entities/qc-release-certificate.entity";
import { QcReleaseCertificateRepository } from "./qc-release-certificate.repository";

@Injectable()
export class MongoQcReleaseCertificateRepository
  extends MongoCrudRepository<QcReleaseCertificate>
  implements QcReleaseCertificateRepository
{
  constructor(@InjectModel("QcReleaseCertificate") model: Model<QcReleaseCertificate>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcReleaseCertificate[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByIdForJobCard(
    id: number,
    companyId: number,
    jobCardId: number,
  ): Promise<QcReleaseCertificate | null> {
    const doc = await this.documents.findOne({ _id: id, companyId, jobCardId }).lean().exec();
    return this.toDomain(doc);
  }

  async findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcReleaseCertificate[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCpo(companyId: number, cpoId: number): Promise<QcReleaseCertificate[]> {
    const docs = await this.documents
      .find({ companyId, cpoId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcReleaseCertificate | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
