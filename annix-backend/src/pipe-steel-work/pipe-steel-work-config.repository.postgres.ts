import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PipeSteelWorkConfigEntity } from "./entities/pipe-steel-work-config.entity";
import { PipeSteelWorkConfigRepository } from "./pipe-steel-work-config.repository";

@Injectable()
export class PostgresPipeSteelWorkConfigRepository
  extends TypeOrmCrudRepository<PipeSteelWorkConfigEntity>
  implements PipeSteelWorkConfigRepository
{
  constructor(
    @InjectRepository(PipeSteelWorkConfigEntity) repository: Repository<PipeSteelWorkConfigEntity>,
  ) {
    super(repository);
  }

  findByConfigKey(key: string): Promise<PipeSteelWorkConfigEntity | null> {
    return this.repository.findOne({
      where: { configKey: key },
    });
  }

  findByCategoryOrdered(category: string): Promise<PipeSteelWorkConfigEntity[]> {
    return this.repository.find({
      where: { category },
      order: { configKey: "ASC" },
    });
  }

  findAllOrdered(): Promise<PipeSteelWorkConfigEntity[]> {
    return this.repository.find({
      order: { category: "ASC", configKey: "ASC" },
    });
  }
}
