import { CrudRepository } from "../lib/persistence/crud-repository";
import { TankChuteRfq } from "./entities/tank-chute-rfq.entity";

export abstract class TankChuteRfqRepository extends CrudRepository<TankChuteRfq> {}
