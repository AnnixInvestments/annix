import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitEeDisclosureInvite } from "../entities/annix-orbit-ee-disclosure-invite.entity";
import { AnnixOrbitEeDisclosureInviteRepository } from "./annix-orbit-ee-disclosure-invite.repository";

@Injectable()
export class PostgresAnnixOrbitEeDisclosureInviteRepository
  extends TypeOrmCrudRepository<AnnixOrbitEeDisclosureInvite>
  implements AnnixOrbitEeDisclosureInviteRepository
{
  constructor(
    @InjectRepository(AnnixOrbitEeDisclosureInvite)
    repository: Repository<AnnixOrbitEeDisclosureInvite>,
  ) {
    super(repository);
  }

  findActiveInvite(
    candidateId: number,
    jobPostingId: number,
    now: Date,
  ): Promise<AnnixOrbitEeDisclosureInvite | null> {
    return this.repository.findOne({
      where: {
        candidateId,
        jobPostingId,
        usedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      order: { createdAt: "DESC" },
    });
  }

  findByToken(token: string): Promise<AnnixOrbitEeDisclosureInvite | null> {
    return this.repository.findOne({ where: { token } });
  }

  findByTokenWithRelations(token: string): Promise<AnnixOrbitEeDisclosureInvite | null> {
    return this.repository.findOne({
      where: { token },
      relations: ["candidate", "jobPosting"],
    });
  }

  async markUsed(id: number, usedAt: Date): Promise<void> {
    await this.repository.update(id, { usedAt });
  }
}
