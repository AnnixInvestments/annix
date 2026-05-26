import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { GuardianLink } from "../entities/guardian-link.entity";
import { GuardianLinkRepository } from "./guardian-link.repository";

@Injectable()
export class PostgresGuardianLinkRepository
  extends TypeOrmCrudRepository<GuardianLink>
  implements GuardianLinkRepository
{
  constructor(@InjectRepository(GuardianLink) repository: Repository<GuardianLink>) {
    super(repository);
  }

  orderedForProfile(educationProfileId: string): Promise<GuardianLink[]> {
    return this.repository.find({
      where: { educationProfileId },
      order: { invitedAt: "DESC" },
    });
  }

  findByProfileAndEmail(
    educationProfileId: string,
    guardianEmail: string,
  ): Promise<GuardianLink | null> {
    return this.repository.findOne({ where: { educationProfileId, guardianEmail } });
  }

  allOrderedByInvitedAt(): Promise<GuardianLink[]> {
    return this.repository.find({ order: { invitedAt: "DESC" } });
  }
}
