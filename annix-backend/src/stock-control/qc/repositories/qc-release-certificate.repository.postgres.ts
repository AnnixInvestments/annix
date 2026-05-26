import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcReleaseCertificate } from "../entities/qc-release-certificate.entity";
import { QcReleaseCertificateRepository } from "./qc-release-certificate.repository";

@Injectable()
export class PostgresQcReleaseCertificateRepository
  extends TypeOrmCrudRepository<QcReleaseCertificate>
  implements QcReleaseCertificateRepository
{
  constructor(
    @InjectRepository(QcReleaseCertificate) repository: Repository<QcReleaseCertificate>,
  ) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcReleaseCertificate[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  findOneByIdForJobCard(
    id: number,
    companyId: number,
    jobCardId: number,
  ): Promise<QcReleaseCertificate | null> {
    return this.repository.findOne({
      where: { id, companyId, jobCardId },
    });
  }

  findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcReleaseCertificate[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { createdAt: "ASC" },
    });
  }

  findForCpo(companyId: number, cpoId: number): Promise<QcReleaseCertificate[]> {
    return this.repository.find({
      where: { companyId, cpoId },
      order: { createdAt: "DESC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcReleaseCertificate | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
