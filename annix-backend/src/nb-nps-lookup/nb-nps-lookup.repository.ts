import { CrudRepository } from "../lib/persistence/crud-repository";
import { NbNpsLookup } from "./entities/nb-nps-lookup.entity";

export abstract class NbNpsLookupRepository extends CrudRepository<NbNpsLookup> {
  abstract findByNbMm(nbMm: number): Promise<NbNpsLookup | null>;
}
