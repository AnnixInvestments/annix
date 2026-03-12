import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { IdempotencyKey } from "../entities/idempotency-key.entity";

const TTL_HOURS = 24;

@Injectable()
export class IdempotencyService {
	private readonly logger = new Logger(IdempotencyService.name);

	constructor(
		@InjectRepository(IdempotencyKey)
		private readonly repo: Repository<IdempotencyKey>,
	) {}

	async findByKey(key: string): Promise<IdempotencyKey | null> {
		return this.repo.findOne({ where: { key } });
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
		const entry = this.repo.create({
			key,
			requestMethod: method,
			requestPath: path,
			companyId,
			responseStatus,
			responseBody,
			expiresAt,
		});
		return this.repo.save(entry);
	}

	async cleanupExpired(): Promise<number> {
		const result = await this.repo.delete({
			expiresAt: LessThan(now().toJSDate()),
		});
		return result.affected ?? 0;
	}
}
