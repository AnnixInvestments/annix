import { CrudRepository } from "../lib/persistence/crud-repository";
import { TeamMember } from "./entities/team-member.entity";

export abstract class TeamMemberRepository extends CrudRepository<TeamMember> {
  abstract findByOrganization(organizationId: number): Promise<TeamMember[]>;
  abstract findActiveByOrganization(organizationId: number): Promise<TeamMember[]>;
  abstract findByIdWithRelations(id: number): Promise<TeamMember | null>;
  abstract findByOrganizationAndUser(
    organizationId: number,
    userId: number,
  ): Promise<TeamMember | null>;
  abstract findByUserAnyOrganization(userId: number): Promise<TeamMember | null>;
  abstract findDirectReports(organizationId: number, reportsToId: number): Promise<TeamMember[]>;
  abstract findByUserWithOrganization(userId: number): Promise<TeamMember | null>;
  abstract findFirstByOrganizationWithUser(organizationId: number): Promise<TeamMember | null>;
  abstract countByOrganization(organizationId: number): Promise<number>;
  abstract countActiveByOrganization(organizationId: number): Promise<number>;
  abstract findActiveByOrganizationWithUser(organizationId: number): Promise<TeamMember[]>;
}
