import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { CrudRepository } from "../../lib/persistence/crud-repository";
import { Quotation } from "../entities/quotation.entity";

export abstract class QuotationRepository extends CrudRepository<Quotation> {
  abstract build(data: Partial<Quotation>): Quotation;
  abstract update(id: number, data: DeepPartial<Quotation>): Promise<Quotation | null>;
  abstract delete(id: number): Promise<boolean>;
}
