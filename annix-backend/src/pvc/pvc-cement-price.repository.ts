import { CrudRepository } from "../lib/persistence/crud-repository";
import { PvcCementPrice } from "./entities/pvc-cement-price.entity";

export abstract class PvcCementPriceRepository extends CrudRepository<PvcCementPrice> {
  abstract findActiveByDN(nominalDiameter: number): Promise<PvcCementPrice | null>;
}
