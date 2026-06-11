import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PendingSeekerTier } from "../entities/pending-seeker-tier.entity";
import { PendingSeekerTierRepository } from "./pending-seeker-tier.repository";

@Injectable()
export class PostgresPendingSeekerTierRepository
  extends TypeOrmCrudRepository<PendingSeekerTier>
  implements PendingSeekerTierRepository
{
  constructor(@InjectRepository(PendingSeekerTier) repository: Repository<PendingSeekerTier>) {
    super(repository);
  }

  findByEmailNormalized(email: string): Promise<PendingSeekerTier | null> {
    return this.repository.findOne({ where: { emailNormalized: email } });
  }

  async deleteByEmailNormalized(email: string): Promise<void> {
    await this.repository.delete({ emailNormalized: email });
  }
}
