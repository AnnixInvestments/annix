import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import type { PasskeyChallengeType } from "./entities/passkey-challenge.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";
import { PasskeyChallengeRepository } from "./passkey-challenge.repository";

@Injectable()
export class PostgresPasskeyChallengeRepository
  extends TypeOrmCrudRepository<PasskeyChallenge>
  implements PasskeyChallengeRepository
{
  constructor(@InjectRepository(PasskeyChallenge) repository: Repository<PasskeyChallenge>) {
    super(repository);
  }

  findLatestForUserAndType(
    userId: number | null,
    type: PasskeyChallengeType,
  ): Promise<PasskeyChallenge | null> {
    const where = userId !== null ? { userId, type } : { userId: IsNull(), type };
    return this.repository.findOne({ where, order: { createdAt: "DESC" } });
  }

  findLatestForAuthenticationByUserId(userId: number): Promise<PasskeyChallenge | null> {
    return this.repository.findOne({
      where: [
        { userId, type: "authentication" as PasskeyChallengeType },
        { userId: IsNull(), type: "authentication" as PasskeyChallengeType },
      ],
      order: { createdAt: "DESC" },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete({ id });
  }

  async deleteExpiredBefore(cutoff: Date): Promise<number> {
    const result = await this.repository.delete({ expiresAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
