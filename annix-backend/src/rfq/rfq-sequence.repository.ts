import { CrudRepository } from "../lib/persistence/crud-repository";
import { RfqSequence } from "./entities/rfq-sequence.entity";

export abstract class RfqSequenceRepository extends CrudRepository<RfqSequence> {
  abstract findByYear(year: number): Promise<RfqSequence | null>;
  abstract findAllOrderedByYearDesc(): Promise<RfqSequence[]>;
}
