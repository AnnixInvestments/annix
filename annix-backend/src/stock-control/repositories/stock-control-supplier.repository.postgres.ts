import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockControlSupplierRepository } from "./stock-control-supplier.repository";

@Injectable()
export class PostgresStockControlSupplierRepository
  extends TypeOrmCrudRepository<StockControlSupplier>
  implements StockControlSupplierRepository
{
  constructor(
    @InjectRepository(StockControlSupplier) repository: Repository<StockControlSupplier>,
  ) {
    super(repository);
  }

  build(data: DeepPartial<StockControlSupplier>): StockControlSupplier {
    return this.repository.create(data as TypeOrmDeepPartial<StockControlSupplier>);
  }

  findAllForCompanyOrderedByName(companyId: number): Promise<StockControlSupplier[]> {
    return this.repository.find({ where: { companyId }, order: { name: "ASC" } });
  }

  findAllForCompany(companyId: number): Promise<StockControlSupplier[]> {
    return this.repository.find({ where: { companyId } });
  }

  findOneForCompany(id: number, companyId: number): Promise<StockControlSupplier | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneForCompanyByNameCaseInsensitive(
    companyId: number,
    name: string,
  ): Promise<StockControlSupplier | null> {
    return this.repository
      .createQueryBuilder("supplier")
      .where("supplier.companyId = :companyId", { companyId })
      .andWhere("LOWER(supplier.name) = LOWER(:name)", { name })
      .getOne();
  }
}
