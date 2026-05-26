import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlCompanyRole } from "../entities/stock-control-company-role.entity";
import { StockControlCompanyRoleRepository } from "./stock-control-company-role.repository";

@Injectable()
export class PostgresStockControlCompanyRoleRepository
  extends TypeOrmCrudRepository<StockControlCompanyRole>
  implements StockControlCompanyRoleRepository
{
  constructor(
    @InjectRepository(StockControlCompanyRole) repository: Repository<StockControlCompanyRole>,
  ) {
    super(repository);
  }

  findForCompanyOrdered(companyId: number): Promise<StockControlCompanyRole[]> {
    return this.repository.find({
      where: { companyId },
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  findOneForCompanyByKey(companyId: number, key: string): Promise<StockControlCompanyRole | null> {
    return this.repository.findOne({ where: { companyId, key } });
  }

  findOneForCompany(id: number, companyId: number): Promise<StockControlCompanyRole | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  async maxSortOrderForCompany(companyId: number): Promise<number | null> {
    const result = await this.repository
      .createQueryBuilder("r")
      .select("MAX(r.sort_order)", "max")
      .where("r.company_id = :companyId", { companyId })
      .getRawOne();
    return result?.max ?? null;
  }

  findAllForCompany(companyId: number): Promise<StockControlCompanyRole[]> {
    return this.repository.find({ where: { companyId } });
  }

  buildMany(rows: DeepPartial<StockControlCompanyRole>[]): StockControlCompanyRole[] {
    return this.repository.create(rows as TypeOrmDeepPartial<StockControlCompanyRole>[]);
  }

  saveMany(entities: StockControlCompanyRole[]): Promise<StockControlCompanyRole[]> {
    return this.repository.save(entities);
  }
}
