import { Bolt } from "../bolt/entities/bolt.entity";
import { CrudRepository } from "../lib/persistence/crud-repository";
import { Washer } from "./entities/washer.entity";

export interface WasherFilters {
  boltId?: number;
  type?: string;
  material?: string;
}

export abstract class WasherRepository extends CrudRepository<Washer> {
  abstract findBoltById(id: number): Promise<Bolt | null>;
  abstract findAllFiltered(filters?: WasherFilters): Promise<Washer[]>;
  abstract findOneWithBolt(id: number): Promise<Washer | null>;
  abstract findByBoltDesignation(designation: string, type?: string): Promise<Washer[]>;
  abstract typesGrouped(): Promise<Array<{ type: string; count: number }>>;
  abstract boltDesignationsForType(type: string): Promise<Array<{ size: string }>>;
}
