import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitTask } from "../entities/annix-orbit-task.entity";
import { AnnixOrbitTaskRepository } from "./annix-orbit-task.repository";

@Injectable()
export class PostgresAnnixOrbitTaskRepository
  extends TypeOrmCrudRepository<AnnixOrbitTask>
  implements AnnixOrbitTaskRepository
{
  constructor(@InjectRepository(AnnixOrbitTask) repository: Repository<AnnixOrbitTask>) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitTask[]> {
    return this.repository
      .createQueryBuilder("t")
      .where("t.company_id = :companyId", { companyId })
      .orderBy("t.done", "ASC")
      .addOrderBy("t.due_date", "ASC", "NULLS LAST")
      .getMany();
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTask | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
