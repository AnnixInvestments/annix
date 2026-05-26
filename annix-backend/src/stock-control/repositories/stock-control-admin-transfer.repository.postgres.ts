import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  AdminTransferStatus,
  StockControlAdminTransfer,
} from "../entities/stock-control-admin-transfer.entity";
import { StockControlAdminTransferRepository } from "./stock-control-admin-transfer.repository";

@Injectable()
export class PostgresStockControlAdminTransferRepository
  extends TypeOrmCrudRepository<StockControlAdminTransfer>
  implements StockControlAdminTransferRepository
{
  constructor(
    @InjectRepository(StockControlAdminTransfer)
    repository: Repository<StockControlAdminTransfer>,
  ) {
    super(repository);
  }

  findPendingForCompany(companyId: number): Promise<StockControlAdminTransfer | null> {
    return this.repository.findOne({
      where: { companyId, status: AdminTransferStatus.PENDING },
    });
  }

  findPendingForCompanyWithInitiator(companyId: number): Promise<StockControlAdminTransfer | null> {
    return this.repository.findOne({
      where: { companyId, status: AdminTransferStatus.PENDING },
      relations: ["initiatedBy", "initiatedBy.company"],
    });
  }

  findPendingByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<StockControlAdminTransfer | null> {
    return this.repository.findOne({
      where: { id, companyId, status: AdminTransferStatus.PENDING },
    });
  }

  findByStatusToken(
    token: string,
    status: AdminTransferStatus,
  ): Promise<StockControlAdminTransfer | null> {
    return this.repository.findOne({
      where: { token, status },
    });
  }
}
