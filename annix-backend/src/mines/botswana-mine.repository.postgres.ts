import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BotswanaMineRepository } from "./botswana-mine.repository";
import { BotswanaMine } from "./entities/botswana-mine.entity";

@Injectable()
export class PostgresBotswanaMineRepository
  extends TypeOrmCrudRepository<BotswanaMine>
  implements BotswanaMineRepository
{
  constructor(@InjectRepository(BotswanaMine) repository: Repository<BotswanaMine>) {
    super(repository);
  }
}
