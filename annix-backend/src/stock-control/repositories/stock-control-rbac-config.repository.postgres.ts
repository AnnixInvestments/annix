import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";
import { StockControlRbacConfigRepository } from "./stock-control-rbac-config.repository";

@Injectable()
export class PostgresStockControlRbacConfigRepository
  extends TypeOrmCrudRepository<StockControlRbacConfig>
  implements StockControlRbacConfigRepository
{
  constructor(
    @InjectRepository(StockControlRbacConfig) repository: Repository<StockControlRbacConfig>,
  ) {
    super(repository);
  }

  findForCompany(companyId: number): Promise<StockControlRbacConfig[]> {
    return this.repository.find({ where: { companyId } });
  }
}
