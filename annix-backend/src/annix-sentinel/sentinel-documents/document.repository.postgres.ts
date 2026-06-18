import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelDocumentRepository } from "./document.repository";
import { AnnixSentinelDocument } from "./entities/document.entity";

@Injectable()
export class PostgresAnnixSentinelDocumentRepository
  extends TypeOrmCrudRepository<AnnixSentinelDocument>
  implements AnnixSentinelDocumentRepository
{
  constructor(
    @InjectRepository(AnnixSentinelDocument) repository: Repository<AnnixSentinelDocument>,
  ) {
    super(repository);
  }

  findByCompanyNewestFirst(companyId: number): Promise<AnnixSentinelDocument[]> {
    return this.repository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
  }

  findByCompanyAndRequirementNewestFirst(
    companyId: number,
    requirementId: number,
  ): Promise<AnnixSentinelDocument[]> {
    return this.repository.find({
      where: { companyId, requirementId },
      order: { createdAt: "DESC" },
    });
  }

  findByIdAndCompany(id: number, companyId: number): Promise<AnnixSentinelDocument | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByCompanyAndRequirementIds(
    companyId: number,
    requirementIds: number[],
  ): Promise<AnnixSentinelDocument[]> {
    return this.repository.find({
      where: { companyId, requirementId: In(requirementIds) },
    });
  }

  findWithExpiryDate(): Promise<AnnixSentinelDocument[]> {
    return this.repository.find({
      where: { expiryDate: Not(IsNull()) },
    });
  }
}
