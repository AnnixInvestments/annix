import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberCompanyDirector } from "../entities/rubber-company-director.entity";
import { RubberCompanyDirectorRepository } from "./rubber-company-director.repository";

@Injectable()
export class PostgresRubberCompanyDirectorRepository
  extends TypeOrmCrudRepository<RubberCompanyDirector>
  implements RubberCompanyDirectorRepository
{
  constructor(
    @InjectRepository(RubberCompanyDirector) repository: Repository<RubberCompanyDirector>,
  ) {
    super(repository);
  }

  findAllOrderedByName(): Promise<RubberCompanyDirector[]> {
    return this.repository.find({
      order: { name: "ASC" },
    });
  }

  findActiveOrderedByName(): Promise<RubberCompanyDirector[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
  }

  build(data: Partial<RubberCompanyDirector>): RubberCompanyDirector {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompanyDirector>);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }
}
