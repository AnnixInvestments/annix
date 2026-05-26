import { CrudRepository } from "../lib/persistence/crud-repository";
import { BoqLineItem } from "./entities/boq-line-item.entity";

export abstract class BoqLineItemRepository extends CrudRepository<BoqLineItem> {
  abstract maxLineNumber(boqId: number): Promise<number>;
  abstract findByBoq(boqId: number): Promise<BoqLineItem[]>;
  abstract findOneByBoq(lineItemId: number, boqId: number): Promise<BoqLineItem | null>;
  abstract reorderByIds(ids: number[]): Promise<void>;
}
