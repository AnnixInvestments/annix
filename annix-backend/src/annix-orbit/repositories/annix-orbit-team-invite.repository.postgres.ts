import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitTeamInvite } from "../entities/annix-orbit-team-invite.entity";
import { AnnixOrbitTeamInviteRepository } from "./annix-orbit-team-invite.repository";

@Injectable()
export class PostgresAnnixOrbitTeamInviteRepository
  extends TypeOrmCrudRepository<AnnixOrbitTeamInvite>
  implements AnnixOrbitTeamInviteRepository
{
  constructor(
    @InjectRepository(AnnixOrbitTeamInvite) repository: Repository<AnnixOrbitTeamInvite>,
  ) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitTeamInvite[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTeamInvite | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByToken(token: string): Promise<AnnixOrbitTeamInvite | null> {
    return this.repository.findOne({ where: { token } });
  }
}
