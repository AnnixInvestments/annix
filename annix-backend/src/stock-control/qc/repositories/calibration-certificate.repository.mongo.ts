import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { CalibrationCertificate } from "../entities/calibration-certificate.entity";
import { CalibrationCertificateRepository } from "./calibration-certificate.repository";

@Injectable()
export class MongoCalibrationCertificateRepository
  extends MongoCrudRepository<CalibrationCertificate>
  implements CalibrationCertificateRepository
{
  constructor(@InjectModel("CalibrationCertificate") model: Model<CalibrationCertificate>) {
    super(model);
  }

  async findAllForCompany(
    companyId: number,
    activeFilter: boolean | undefined,
  ): Promise<CalibrationCertificate[]> {
    const filter: Record<string, unknown> = { companyId };
    if (activeFilter !== undefined) {
      filter.isActive = activeFilter;
    }
    const docs = await this.documents.find(filter).sort({ expiryDate: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<CalibrationCertificate | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findActiveForCompanyUnordered(companyId: number): Promise<CalibrationCertificate[]> {
    const docs = await this.documents.find({ companyId, isActive: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveForCompany(companyId: number): Promise<CalibrationCertificate[]> {
    const docs = await this.documents
      .find({ companyId, isActive: true })
      .sort({ equipmentName: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findExpiryWarningCandidates(expiryOnOrBefore: string): Promise<CalibrationCertificate[]> {
    const docs = await this.documents
      .find({
        isActive: true,
        expiryDate: { $lte: expiryOnOrBefore },
        expiryWarningSentAt: null,
        expiryNotificationSentAt: null,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findExpiredCandidates(expiryOnOrBefore: string): Promise<CalibrationCertificate[]> {
    const docs = await this.documents
      .find({
        isActive: true,
        expiryDate: { $lte: expiryOnOrBefore },
        expiryNotificationSentAt: null,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
