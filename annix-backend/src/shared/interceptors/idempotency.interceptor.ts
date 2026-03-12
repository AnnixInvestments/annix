import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { now } from "../../lib/datetime";
import { IdempotencyService } from "../services/idempotency.service";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
	private readonly logger = new Logger(IdempotencyInterceptor.name);

	constructor(private readonly idempotencyService: IdempotencyService) {}

	async intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Promise<Observable<unknown>> {
		const request = context.switchToHttp().getRequest();
		const idempotencyKey = request.headers["idempotency-key"];

		if (!idempotencyKey || request.method !== "POST") {
			return next.handle();
		}

		const existing = await this.idempotencyService.findByKey(idempotencyKey);

		if (existing && existing.expiresAt > now().toJSDate()) {
			const response = context.switchToHttp().getResponse();
			response.status(existing.responseStatus);
			return of(existing.responseBody);
		}

		return next.handle().pipe(
			tap(async (responseBody) => {
				const companyId = request.user?.companyId ?? 0;
				await this.idempotencyService
					.store(
						idempotencyKey,
						request.method,
						request.path,
						companyId,
						200,
						responseBody as Record<string, unknown>,
					)
					.catch((err) => {
						if (err?.code !== "23505") {
							this.logger.error(
								`Failed to store idempotency key: ${err.message}`,
							);
						}
					});
			}),
		);
	}
}
