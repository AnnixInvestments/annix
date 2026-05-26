import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { CalibrationCertificate } from "../entities/calibration-certificate.entity";
import { CalibrationCertificateRepository } from "./calibration-certificate.repository";

@Injectable()
export class PostgresCalibrationCertificateRepository
  extends TypeOrmCrudRepository<CalibrationCertificate>
  implements CalibrationCertificateRepository
{
  constructor(
    @InjectRepository(CalibrationCertificate) repository: Repository<CalibrationCertificate>,
  ) {
    super(repository);
  }

  findAllForCompany(
    companyId: number,
    activeFilter: boolean | undefined,
  ): Promise<CalibrationCertificate[]> {
    const qb = this.repository
      .createQueryBuilder("cal")
      .where("cal.companyId = :companyId", { companyId })
      .orderBy("cal.expiryDate", "ASC");

    if (activeFilter !== undefined) {
      qb.andWhere("cal.isActive = :active", { active: activeFilter });
    }

    return qb.getMany();
  }

  findByIdForCompany(companyId: number, id: number): Promise<CalibrationCertificate | null> {
    return this.repository.findOne({
      where: { id, companyId },
    });
  }

  findActiveForCompanyUnordered(companyId: number): Promise<CalibrationCertificate[]> {
    return this.repository.find({
      where: { companyId, isActive: true },
    });
  }

  findActiveForCompany(companyId: number): Promise<CalibrationCertificate[]> {
    return this.repository.find({
      where: { companyId, isActive: true },
      order: { equipmentName: "ASC" },
    });
  }

  findExpiryWarningCandidates(expiryOnOrBefore: string): Promise<CalibrationCertificate[]> {
    return this.repository.find({
      where: {
        isActive: true,
        expiryDate: LessThanOrEqual(expiryOnOrBefore),
        expiryWarningSentAt: IsNull(),
        expiryNotificationSentAt: IsNull(),
      },
    });
  }

  findExpiredCandidates(expiryOnOrBefore: string): Promise<CalibrationCertificate[]> {
    return this.repository.find({
      where: {
        isActive: true,
        expiryDate: LessThanOrEqual(expiryOnOrBefore),
        expiryNotificationSentAt: IsNull(),
      },
    });
  }
}
