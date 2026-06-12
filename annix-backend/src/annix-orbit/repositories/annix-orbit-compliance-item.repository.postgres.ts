import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitComplianceItem } from "../entities/annix-orbit-compliance-item.entity";
import { AnnixOrbitComplianceItemRepository } from "./annix-orbit-compliance-item.repository";

@Injectable()
export class PostgresAnnixOrbitComplianceItemRepository
  extends TypeOrmCrudRepository<AnnixOrbitComplianceItem>
  implements AnnixOrbitComplianceItemRepository
{
  constructor(
    @InjectRepository(AnnixOrbitComplianceItem) repository: Repository<AnnixOrbitComplianceItem>,
  ) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitComplianceItem[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitComplianceItem | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
