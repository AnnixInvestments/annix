import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CompoundDataSheet } from "../entities/compound-data-sheet.entity";

export abstract class CompoundDataSheetRepository extends CrudRepository<CompoundDataSheet> {
  abstract findPublishedOrdered(): Promise<CompoundDataSheet[]>;
  abstract findOnePublishedBySlug(slug: string): Promise<CompoundDataSheet | null>;
  abstract findAllOrdered(): Promise<CompoundDataSheet[]>;
  abstract findOneBySlug(slug: string): Promise<CompoundDataSheet | null>;
  abstract build(data: Partial<CompoundDataSheet>): CompoundDataSheet;
}
