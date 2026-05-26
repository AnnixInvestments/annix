import { CrudRepository } from "../lib/persistence/crud-repository";
import { HdpeButtweldPrice } from "./entities/hdpe-buttweld-price.entity";

export abstract class HdpeButtweldPriceRepository extends CrudRepository<HdpeButtweldPrice> {
  abstract findByNominalBore(nominalBore: number): Promise<HdpeButtweldPrice | null>;
}
