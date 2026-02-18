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

export enum ProspectStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  PROPOSAL = "proposal",
  WON = "won",
  LOST = "lost",
}

export enum ProspectPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum FollowUpRecurrence {
  NONE = "none",
  DAILY = "daily",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
}

@Entity("annix_rep_prospects")
export class Prospect {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @Column({ name: "owner_id" })
  ownerId: number;

  @Column({ name: "company_name", length: 255 })
  companyName: string;

  @Column({ name: "contact_name", type: "varchar", length: 255, nullable: true })
  contactName: string | null;

  @Column({ name: "contact_email", type: "varchar", length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ name: "contact_phone", type: "varchar", length: 50, nullable: true })
  contactPhone: string | null;

  @Column({ name: "contact_title", type: "varchar", length: 100, nullable: true })
  contactTitle: string | null;

  @Column({ name: "street_address", type: "varchar", length: 500, nullable: true })
  streetAddress: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province: string | null;

  @Column({ name: "postal_code", type: "varchar", length: 20, nullable: true })
  postalCode: string | null;

  @Column({ length: 100, default: "South Africa" })
  country: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ name: "google_place_id", type: "varchar", length: 255, nullable: true })
  googlePlaceId: string | null;

  @Column({
    type: "enum",
    enum: ProspectStatus,
    default: ProspectStatus.NEW,
  })
  status: ProspectStatus;

  @Column({
    type: "enum",
    enum: ProspectPriority,
    default: ProspectPriority.MEDIUM,
  })
  priority: ProspectPriority;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "simple-array", nullable: true })
  tags: string[] | null;

  @Column({ name: "estimated_value", type: "decimal", precision: 15, scale: 2, nullable: true })
  estimatedValue: number | null;

  @Column({ name: "crm_external_id", type: "varchar", length: 255, nullable: true })
  crmExternalId: string | null;

  @Column({ name: "crm_sync_status", type: "varchar", length: 50, nullable: true })
  crmSyncStatus: string | null;

  @Column({ name: "crm_last_synced_at", type: "timestamp", nullable: true })
  crmLastSyncedAt: Date | null;

  @Column({ name: "last_contacted_at", type: "timestamp", nullable: true })
  lastContactedAt: Date | null;

  @Column({ name: "next_follow_up_at", type: "timestamp", nullable: true })
  nextFollowUpAt: Date | null;

  @Column({
    name: "follow_up_recurrence",
    type: "enum",
    enum: FollowUpRecurrence,
    default: FollowUpRecurrence.NONE,
  })
  followUpRecurrence: FollowUpRecurrence;

  @Column({ name: "custom_fields", type: "json", nullable: true })
  customFields: Record<string, unknown> | null;

  @Column({ type: "integer", default: 0 })
  score: number;

  @Column({ name: "score_updated_at", type: "timestamp", nullable: true })
  scoreUpdatedAt: Date | null;

  @Column({ name: "assigned_to_id", type: "integer", nullable: true })
  assignedToId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
