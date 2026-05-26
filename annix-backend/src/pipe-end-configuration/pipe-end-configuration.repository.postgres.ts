import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PipeEndConfiguration } from "./entities/pipe-end-configuration.entity";
import { PipeEndConfigurationRepository } from "./pipe-end-configuration.repository";

@Injectable()
export class PostgresPipeEndConfigurationRepository
  extends TypeOrmCrudRepository<PipeEndConfiguration>
  implements PipeEndConfigurationRepository
{
  constructor(
    @InjectRepository(PipeEndConfiguration) repository: Repository<PipeEndConfiguration>,
  ) {
    super(repository);
  }

  findAllWithWeldType(): Promise<PipeEndConfiguration[]> {
    return this.repository.find({ relations: ["weldType"] });
  }

  findByCode(configCode: string): Promise<PipeEndConfiguration | null> {
    return this.repository.findOne({
      where: { config_code: configCode },
      relations: ["weldType"],
    });
  }

  findByItemTypeFilter(
    whereClause: Partial<PipeEndConfiguration>,
  ): Promise<PipeEndConfiguration[]> {
    return this.repository.find({
      where: whereClause as FindOptionsWhere<PipeEndConfiguration>,
      relations: ["weldType"],
    });
  }
}
