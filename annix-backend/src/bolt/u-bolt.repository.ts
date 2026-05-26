import { CrudRepository } from "../lib/persistence/crud-repository";
import { UBoltEntity } from "./entities/u-bolt.entity";

export abstract class UBoltRepository extends CrudRepository<UBoltEntity> {
  abstract uBolts(nbMm?: number): Promise<UBoltEntity[]>;
  abstract uBolt(nbMm: number, threadSize?: string): Promise<UBoltEntity | null>;
}
