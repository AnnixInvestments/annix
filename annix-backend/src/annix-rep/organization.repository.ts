import { CrudRepository } from "../lib/persistence/crud-repository";
import { Organization } from "./entities/organization.entity";

export abstract class OrganizationRepository extends CrudRepository<Organization> {
  abstract findBySlug(slug: string): Promise<Organization | null>;
  abstract findWithOwner(id: number): Promise<Organization | null>;
  abstract findBySlugWithOwner(slug: string): Promise<Organization | null>;
}
