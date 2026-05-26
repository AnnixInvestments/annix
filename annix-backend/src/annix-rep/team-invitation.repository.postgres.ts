import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { TeamInvitation, TeamInvitationStatus } from "./entities/team-invitation.entity";
import { TeamInvitationRepository } from "./team-invitation.repository";

@Injectable()
export class PostgresTeamInvitationRepository
  extends TypeOrmCrudRepository<TeamInvitation>
  implements TeamInvitationRepository
{
  constructor(@InjectRepository(TeamInvitation) repository: Repository<TeamInvitation>) {
    super(repository);
  }

  findPendingByOrganization(organizationId: number): Promise<TeamInvitation[]> {
    return this.repository.find({
      where: { organizationId, status: TeamInvitationStatus.PENDING },
      relations: ["invitedBy", "territory"],
      order: { createdAt: "DESC" },
    });
  }

  findByToken(token: string): Promise<TeamInvitation | null> {
    return this.repository.findOne({
      where: { token },
      relations: ["organization", "invitedBy", "territory"],
    });
  }

  findByIdWithRelations(id: number): Promise<TeamInvitation | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["organization", "invitedBy", "territory"],
    });
  }

  findPendingByOrganizationAndEmail(
    organizationId: number,
    email: string,
  ): Promise<TeamInvitation | null> {
    return this.repository.findOne({
      where: {
        organizationId,
        email,
        status: TeamInvitationStatus.PENDING,
      },
    });
  }

  async expireOldPending(asOf: Date): Promise<number> {
    const result = await this.repository.update(
      {
        status: TeamInvitationStatus.PENDING,
        expiresAt: LessThan(asOf),
      },
      { status: TeamInvitationStatus.EXPIRED },
    );
    return result.affected ?? 0;
  }
}
