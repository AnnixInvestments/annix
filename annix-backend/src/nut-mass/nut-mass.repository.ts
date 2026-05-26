import { Bolt } from "../bolt/entities/bolt.entity";
import { CrudRepository } from "../lib/persistence/crud-repository";
import { NutMass } from "./entities/nut-mass.entity";

export abstract class NutMassRepository extends CrudRepository<NutMass> {
  abstract findAllWithBolt(): Promise<NutMass[]>;
  abstract findOneWithBolt(id: number): Promise<NutMass | null>;
  abstract findExisting(boltId: number, mass_kg: number): Promise<NutMass | null>;
  abstract findByBoltId(boltId: number): Promise<NutMass | null>;
  abstract findBolt(id: number): Promise<Bolt | null>;
  abstract createNut(data: Partial<NutMass>): Promise<NutMass>;
  abstract saveNut(entity: NutMass): Promise<NutMass>;
  abstract removeNut(entity: NutMass): Promise<void>;
  abstract typesGrouped(): Promise<Array<{ type: string; count: number }>>;
  abstract boltDesignationsForType(type: string): Promise<Array<{ size: string }>>;
  abstract gradesForTypeAndSize(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>>;
}
