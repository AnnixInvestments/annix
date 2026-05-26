import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";
import { StockControlActionPermissionRepository } from "./stock-control-action-permission.repository";

@Injectable()
export class PostgresStockControlActionPermissionRepository
  extends TypeOrmCrudRepository<StockControlActionPermission>
  implements StockControlActionPermissionRepository
{
  constructor(
    @InjectRepository(StockControlActionPermission)
    repository: Repository<StockControlActionPermission>,
  ) {
    super(repository);
  }

  findForCompany(companyId: number): Promise<StockControlActionPermission[]> {
    return this.repository.find({ where: { companyId } });
  }
}
