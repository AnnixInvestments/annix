import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DispatchScan } from "../entities/dispatch-scan.entity";
import { DispatchScanRepository } from "./dispatch-scan.repository";

@Injectable()
export class PostgresDispatchScanRepository
  extends TypeOrmCrudRepository<DispatchScan>
  implements DispatchScanRepository
{
  constructor(@InjectRepository(DispatchScan) repository: Repository<DispatchScan>) {
    super(repository);
  }

  findForJobCardItem(jobCardId: number, stockItemId: number): Promise<DispatchScan[]> {
    return this.repository.find({
      where: { jobCardId, stockItemId },
    });
  }

  findForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
    });
  }

  findHistoryForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      relations: ["stockItem", "scannedBy"],
      order: { scannedAt: "DESC" },
    });
  }

  findOneForCompanyWithJobCard(scanId: number, companyId: number): Promise<DispatchScan | null> {
    return this.repository.findOne({
      where: { id: scanId, companyId },
      relations: ["jobCard"],
    });
  }
}
