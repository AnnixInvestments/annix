import { CrudRepository } from "../lib/persistence/crud-repository";
import { BoltMass } from "./entities/bolt-mass.entity";

export abstract class BoltMassRepository extends CrudRepository<BoltMass> {
  abstract findClosestByBoltAndMinLength(
    boltId: number,
    minLengthMm: number,
  ): Promise<BoltMass | null>;
}
