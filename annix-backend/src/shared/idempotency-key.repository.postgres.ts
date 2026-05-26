import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { IdempotencyKey } from "./entities/idempotency-key.entity";
import { IdempotencyKeyRepository } from "./idempotency-key.repository";

@Injectable()
export class PostgresIdempotencyKeyRepository
  extends TypeOrmCrudRepository<IdempotencyKey>
  implements IdempotencyKeyRepository
{
  constructor(@InjectRepository(IdempotencyKey) repository: Repository<IdempotencyKey>) {
    super(repository);
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(before),
    });
    return result.affected ?? 0;
  }
}
