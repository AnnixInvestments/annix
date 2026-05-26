import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ThreadedInsert } from "./entities/threaded-insert.entity";
import { ThreadedInsertRepository } from "./threaded-insert.repository";

@Injectable()
export class PostgresThreadedInsertRepository
  extends TypeOrmCrudRepository<ThreadedInsert>
  implements ThreadedInsertRepository
{
  constructor(@InjectRepository(ThreadedInsert) repository: Repository<ThreadedInsert>) {
    super(repository);
  }

  async insertTypesGrouped(): Promise<Array<{ type: string; count: number }>> {
    return this.repository
      .createQueryBuilder("i")
      .select("i.insert_type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("i.insert_type")
      .getRawMany();
  }

  async insertSizesForType(type: string): Promise<Array<{ size: string }>> {
    return this.repository
      .createQueryBuilder("i")
      .select("DISTINCT i.designation", "size")
      .where("i.insert_type = :type", { type })
      .orderBy("i.designation", "ASC")
      .getRawMany();
  }

  async insertGradesForTypeAndSize(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    return this.repository
      .createQueryBuilder("i")
      .select("DISTINCT i.material", "material")
      .addSelect("NULL", "grade")
      .where("i.insert_type = :type AND i.designation = :size", { type, size })
      .getRawMany();
  }
}
