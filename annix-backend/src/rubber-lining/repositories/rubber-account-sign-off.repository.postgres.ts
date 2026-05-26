import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberAccountSignOff } from "../entities/rubber-account-sign-off.entity";
import { RubberAccountSignOffRepository } from "./rubber-account-sign-off.repository";

@Injectable()
export class PostgresRubberAccountSignOffRepository
  extends TypeOrmCrudRepository<RubberAccountSignOff>
  implements RubberAccountSignOffRepository
{
  constructor(
    @InjectRepository(RubberAccountSignOff) repository: Repository<RubberAccountSignOff>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberAccountSignOff>): RubberAccountSignOff {
    return this.repository.create(data as TypeOrmDeepPartial<RubberAccountSignOff>);
  }

  findByMonthlyAccountId(monthlyAccountId: number): Promise<RubberAccountSignOff[]> {
    return this.repository.find({
      where: { monthlyAccountId },
    });
  }

  findOneByToken(token: string): Promise<RubberAccountSignOff | null> {
    return this.repository.findOne({
      where: { signOffToken: token },
    });
  }
}
