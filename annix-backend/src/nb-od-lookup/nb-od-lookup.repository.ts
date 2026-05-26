import { CrudRepository } from "../lib/persistence/crud-repository";
import { NbOdLookup } from "./entities/nb-od-lookup.entity";

export abstract class NbOdLookupRepository extends CrudRepository<NbOdLookup> {
  abstract findAllOrdered(): Promise<NbOdLookup[]>;
  abstract findByNominalBore(nominalBoreMm: number): Promise<NbOdLookup | null>;
  abstract allNominalBores(): Promise<{ nominalBoreMm: number }[]>;
}
