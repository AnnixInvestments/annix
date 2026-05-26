import { CrudRepository } from "../lib/persistence/crud-repository";
import { CustomFieldValue } from "./entities/custom-field-value.entity";

export abstract class CustomFieldValueRepository extends CrudRepository<CustomFieldValue> {
  abstract findByEntityAndField(
    entityType: "customer" | "supplier",
    entityId: number,
    fieldName: string,
  ): Promise<CustomFieldValue | null>;
  abstract findForEntityOrdered(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<CustomFieldValue[]>;
  abstract findByIdOrFail(id: number): Promise<CustomFieldValue>;
  abstract deleteById(id: number): Promise<void>;
}
