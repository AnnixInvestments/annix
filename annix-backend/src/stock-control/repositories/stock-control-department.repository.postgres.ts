import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlDepartment } from "../entities/stock-control-department.entity";
import { StockControlDepartmentRepository } from "./stock-control-department.repository";

@Injectable()
export class PostgresStockControlDepartmentRepository
  extends TypeOrmCrudRepository<StockControlDepartment>
  implements StockControlDepartmentRepository
{
  constructor(
    @InjectRepository(StockControlDepartment) repository: Repository<StockControlDepartment>,
  ) {
    super(repository);
  }

  findActiveForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]> {
    return this.repository.find({
      where: { companyId, active: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findAllForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]> {
    return this.repository.find({
      where: { companyId },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<StockControlDepartment | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
