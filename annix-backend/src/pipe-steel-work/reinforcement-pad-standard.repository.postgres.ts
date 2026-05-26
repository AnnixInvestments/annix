import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ReinforcementPadStandardEntity } from "./entities/reinforcement-pad-standard.entity";
import { ReinforcementPadStandardRepository } from "./reinforcement-pad-standard.repository";

@Injectable()
export class PostgresReinforcementPadStandardRepository
  extends TypeOrmCrudRepository<ReinforcementPadStandardEntity>
  implements ReinforcementPadStandardRepository
{
  constructor(
    @InjectRepository(ReinforcementPadStandardEntity)
    repository: Repository<ReinforcementPadStandardEntity>,
  ) {
    super(repository);
  }

  findByBranchAndHeader(
    branchNbMm: number,
    headerNbMm: number,
  ): Promise<ReinforcementPadStandardEntity | null> {
    return this.repository.findOne({
      where: { branchNbMm, headerNbMm },
    });
  }
}
