import { CrudRepository } from "../lib/persistence/crud-repository";
import { CustomFieldDefinition } from "./entities/custom-field-definition.entity";

export abstract class CustomFieldDefinitionRepository extends CrudRepository<CustomFieldDefinition> {
  abstract findByUserAndKey(
    userId: number,
    fieldKey: string,
  ): Promise<CustomFieldDefinition | null>;
  abstract findByIdAndUser(id: number, userId: number): Promise<CustomFieldDefinition | null>;
  abstract findForUser(userId: number, includeInactive: boolean): Promise<CustomFieldDefinition[]>;
  abstract saveMany(fields: CustomFieldDefinition[]): Promise<CustomFieldDefinition[]>;
}
