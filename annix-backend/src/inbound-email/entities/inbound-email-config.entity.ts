import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("inbound_email_configs")
@Unique(["app", "companyId"])
export class InboundEmailConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  app: string;

  @Column({ name: "company_id", type: "int", nullable: true })
  companyId: number | null;

  @Column({ name: "email_host", type: "varchar", length: 255 })
  emailHost: string;

  @Column({ name: "email_port", type: "int", default: 993 })
  emailPort: number;

  @Column({ name: "email_user", type: "varchar", length: 255 })
  emailUser: string;

  @Column({ name: "email_pass_encrypted", type: "bytea" })
  emailPassEncrypted: Buffer;

  @Column({ name: "tls_enabled", type: "boolean", default: true })
  tlsEnabled: boolean;

  @Column({ name: "tls_server_name", type: "varchar", length: 255, nullable: true })
  tlsServerName: string | null;

  @Column({ type: "boolean", default: false })
  enabled: boolean;

  @Column({ name: "last_poll_at", type: "timestamp", nullable: true })
  lastPollAt: Date | null;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
