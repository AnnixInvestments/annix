import { CrudRepository } from "../lib/persistence/crud-repository";
import { HdpeStubPrice } from "./entities/hdpe-stub-price.entity";

export abstract class HdpeStubPriceRepository extends CrudRepository<HdpeStubPrice> {
  abstract findByNominalBore(nominalBore: number): Promise<HdpeStubPrice | null>;
}
