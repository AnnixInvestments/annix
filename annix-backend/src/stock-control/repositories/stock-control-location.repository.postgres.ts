import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlLocation } from "../entities/stock-control-location.entity";
import { StockControlLocationRepository } from "./stock-control-location.repository";

@Injectable()
export class PostgresStockControlLocationRepository
  extends TypeOrmCrudRepository<StockControlLocation>
  implements StockControlLocationRepository
{
  constructor(
    @InjectRepository(StockControlLocation) repository: Repository<StockControlLocation>,
  ) {
    super(repository);
  }

  findActiveForCompanyOrdered(companyId: number): Promise<StockControlLocation[]> {
    return this.repository.find({
      where: { companyId, active: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findAllForCompanyOrdered(companyId: number): Promise<StockControlLocation[]> {
    return this.repository.find({
      where: { companyId },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<StockControlLocation | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
