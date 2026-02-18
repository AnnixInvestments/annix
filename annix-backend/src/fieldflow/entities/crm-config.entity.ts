import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum CrmType {
  WEBHOOK = "webhook",
  CSV_EXPORT = "csv_export",
  SALESFORCE = "salesforce",
  HUBSPOT = "hubspot",
  PIPEDRIVE = "pipedrive",
  CUSTOM = "custom",
}

export interface WebhookConfig {
  url: string;
  method: "POST" | "PUT" | "PATCH";
  headers: Record<string, string>;
  authType: "none" | "basic" | "bearer" | "api_key";
  authValue: string | null;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform: string | null;
}

@Entity("annix_rep_crm_configs")
export class CrmConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ length: 100 })
  name: string;

  @Column({
    name: "crm_type",
    type: "enum",
    enum: CrmType,
  })
  crmType: CrmType;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "webhook_config", type: "json", nullable: true })
  webhookConfig: WebhookConfig | null;

  @Column({ name: "api_key_encrypted", type: "text", nullable: true })
  apiKeyEncrypted: string | null;

  @Column({ name: "api_secret_encrypted", type: "text", nullable: true })
  apiSecretEncrypted: string | null;

  @Column({ name: "instance_url", type: "varchar", length: 500, nullable: true })
  instanceUrl: string | null;

  @Column({ name: "prospect_field_mappings", type: "json", nullable: true })
  prospectFieldMappings: FieldMapping[] | null;

  @Column({ name: "meeting_field_mappings", type: "json", nullable: true })
  meetingFieldMappings: FieldMapping[] | null;

  @Column({ name: "sync_prospects", default: true })
  syncProspects: boolean;

  @Column({ name: "sync_meetings", default: true })
  syncMeetings: boolean;

  @Column({ name: "sync_on_create", default: true })
  syncOnCreate: boolean;

  @Column({ name: "sync_on_update", default: true })
  syncOnUpdate: boolean;

  @Column({ name: "last_sync_at", type: "timestamp", nullable: true })
  lastSyncAt: Date | null;

  @Column({ name: "last_sync_error", type: "text", nullable: true })
  lastSyncError: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
