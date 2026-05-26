import { CrudRepository } from "../lib/persistence/crud-repository";
import { BotswanaMine } from "./entities/botswana-mine.entity";

export abstract class BotswanaMineRepository extends CrudRepository<BotswanaMine> {}
