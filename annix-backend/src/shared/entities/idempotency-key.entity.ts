import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from "typeorm";

@Entity("idempotency_keys")
@Index(["key"], { unique: true })
export class IdempotencyKey {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: "varchar", length: 255 })
	key: string;

	@Column({ name: "request_method", type: "varchar", length: 10 })
	requestMethod: string;

	@Column({ name: "request_path", type: "varchar", length: 500 })
	requestPath: string;

	@Column({ name: "response_status", type: "integer" })
	responseStatus: number;

	@Column({ name: "response_body", type: "jsonb" })
	responseBody: Record<string, unknown>;

	@Column({ name: "company_id", type: "integer" })
	companyId: number;

	@CreateDateColumn({ name: "created_at" })
	createdAt: Date;

	@Column({ name: "expires_at", type: "timestamp" })
	expiresAt: Date;
}
