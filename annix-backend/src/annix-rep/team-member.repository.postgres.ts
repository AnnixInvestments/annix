import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { TeamMember, TeamMemberStatus } from "./entities/team-member.entity";
import { TeamMemberRepository } from "./team-member.repository";

@Injectable()
export class PostgresTeamMemberRepository
  extends TypeOrmCrudRepository<TeamMember>
  implements TeamMemberRepository
{
  constructor(@InjectRepository(TeamMember) repository: Repository<TeamMember>) {
    super(repository);
  }

  findByOrganization(organizationId: number): Promise<TeamMember[]> {
    return this.repository.find({
      where: { organizationId },
      relations: ["user", "reportsTo"],
      order: { joinedAt: "ASC" },
    });
  }

  findActiveByOrganization(organizationId: number): Promise<TeamMember[]> {
    return this.repository.find({
      where: { organizationId, status: TeamMemberStatus.ACTIVE },
      relations: ["user", "reportsTo"],
      order: { joinedAt: "ASC" },
    });
  }

  findByIdWithRelations(id: number): Promise<TeamMember | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["user", "reportsTo", "organization"],
    });
  }

  findByOrganizationAndUser(organizationId: number, userId: number): Promise<TeamMember | null> {
    return this.repository.findOne({
      where: { organizationId, userId },
      relations: ["user", "reportsTo", "organization"],
    });
  }

  findByUserAnyOrganization(userId: number): Promise<TeamMember | null> {
    return this.repository.findOne({
      where: { userId },
      relations: ["user", "reportsTo", "organization"],
    });
  }

  findDirectReports(organizationId: number, reportsToId: number): Promise<TeamMember[]> {
    return this.repository.find({
      where: { organizationId, reportsToId },
      relations: ["user"],
    });
  }

  findByUserWithOrganization(userId: number): Promise<TeamMember | null> {
    return this.repository.findOne({
      where: { userId },
      relations: ["organization"],
    });
  }

  findFirstByOrganizationWithUser(organizationId: number): Promise<TeamMember | null> {
    return this.repository.findOne({
      where: { organizationId },
      relations: ["user"],
    });
  }

  countByOrganization(organizationId: number): Promise<number> {
    return this.repository.count({ where: { organizationId } });
  }

  countActiveByOrganization(organizationId: number): Promise<number> {
    return this.repository.count({
      where: { organizationId, status: TeamMemberStatus.ACTIVE },
    });
  }

  findActiveByOrganizationWithUser(organizationId: number): Promise<TeamMember[]> {
    return this.repository.find({
      where: { organizationId, status: TeamMemberStatus.ACTIVE },
      relations: ["user"],
    });
  }
}
