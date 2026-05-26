import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockTakeVarianceCategory } from "../entities/stock-take-variance-category.entity";
import { StockTakeVarianceCategoryRepository } from "./stock-take-variance-category.repository";

@Injectable()
export class PostgresStockTakeVarianceCategoryRepository
  extends TypeOrmCrudRepository<StockTakeVarianceCategory>
  implements StockTakeVarianceCategoryRepository
{
  constructor(
    @InjectRepository(StockTakeVarianceCategory)
    repository: Repository<StockTakeVarianceCategory>,
  ) {
    super(repository);
  }

  build(data: DeepPartial<StockTakeVarianceCategory>): StockTakeVarianceCategory {
    return this.repository.create(data as TypeOrmDeepPartial<StockTakeVarianceCategory>);
  }

  saveMany(categories: StockTakeVarianceCategory[]): Promise<StockTakeVarianceCategory[]> {
    return this.repository.save(categories);
  }

  findByIds(ids: number[]): Promise<StockTakeVarianceCategory[]> {
    return this.repository.createQueryBuilder("c").where("c.id IN (:...ids)", { ids }).getMany();
  }

  findById(id: number): Promise<StockTakeVarianceCategory | null> {
    return this.repository.findOne({ where: { id } });
  }

  findOneForCompany(companyId: number, id: number): Promise<StockTakeVarianceCategory | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findForCompany(
    companyId: number,
    includeInactive: boolean,
  ): Promise<StockTakeVarianceCategory[]> {
    const where: { companyId: number; active?: boolean } = { companyId };
    if (!includeInactive) {
      where.active = true;
    }
    return this.repository.find({ where, order: { sortOrder: "ASC", name: "ASC" } });
  }

  findOneByCompanySlug(companyId: number, slug: string): Promise<StockTakeVarianceCategory | null> {
    return this.repository.findOne({ where: { companyId, slug } });
  }

  findAllForCompany(companyId: number): Promise<StockTakeVarianceCategory[]> {
    return this.repository.find({ where: { companyId } });
  }
}
