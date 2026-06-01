import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { TierInvite } from "../entities/tier-invite.entity";
import { TierInviteRepository } from "./tier-invite.repository";

@Injectable()
export class PostgresTierInviteRepository
  extends TypeOrmCrudRepository<TierInvite>
  implements TierInviteRepository
{
  constructor(@InjectRepository(TierInvite) repository: Repository<TierInvite>) {
    super(repository);
  }

  findByModuleKey(moduleKey: string): Promise<TierInvite[]> {
    return this.repository.find({ where: { moduleKey }, order: { id: "DESC" } });
  }

  findByToken(token: string): Promise<TierInvite | null> {
    return this.repository.findOne({ where: { token } });
  }
}
