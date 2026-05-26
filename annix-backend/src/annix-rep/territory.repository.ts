import { CrudRepository } from "../lib/persistence/crud-repository";
import { Territory } from "./entities/territory.entity";

export abstract class TerritoryRepository extends CrudRepository<Territory> {
  abstract findByOrganization(organizationId: number): Promise<Territory[]>;
  abstract findByIdWithRelations(id: number): Promise<Territory | null>;
  abstract findActiveByOrganization(organizationId: number): Promise<Territory[]>;
  abstract findActiveByAssignedUser(userId: number): Promise<Territory[]>;
  abstract findByOrganizationWithAssignedTo(organizationId: number): Promise<Territory[]>;
}
