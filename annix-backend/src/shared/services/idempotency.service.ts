import { Injectable } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { IdempotencyKey } from "../entities/idempotency-key.entity";
import { IdempotencyKeyRepository } from "../idempotency-key.repository";

const TTL_HOURS = 24;

@Injectable()
export class IdempotencyService {
  constructor(private readonly repo: IdempotencyKeyRepository) {}

  async findByKey(key: string): Promise<IdempotencyKey | null> {
    return this.repo.findOneWhere({ key });
  }

  async store(
    key: string,
    method: string,
    path: string,
    companyId: number,
    responseStatus: number,
    responseBody: Record<string, unknown>,
  ): Promise<IdempotencyKey> {
    const expiresAt = now().plus({ hours: TTL_HOURS }).toJSDate();
    return this.repo.create({
      key,
      requestMethod: method,
      requestPath: path,
      companyId,
      responseStatus,
      responseBody,
      expiresAt,
    });
  }

  async cleanupExpired(): Promise<number> {
    return this.repo.deleteExpired(now().toJSDate());
  }
}
