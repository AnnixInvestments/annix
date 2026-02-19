import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";

export enum TeamActivityType {
  MEMBER_JOINED = "member_joined",
  MEMBER_LEFT = "member_left",
  PROSPECT_CREATED = "prospect_created",
  PROSPECT_STATUS_CHANGED = "prospect_status_changed",
  PROSPECT_HANDOFF = "prospect_handoff",
  MEETING_COMPLETED = "meeting_completed",
  DEAL_WON = "deal_won",
  DEAL_LOST = "deal_lost",
  TERRITORY_ASSIGNED = "territory_assigned",
  NOTE_SHARED = "note_shared",
}

@Entity("annix_rep_team_activities")
export class TeamActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ name: "organization_id" })
  organizationId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({
    name: "activity_type",
    type: "enum",
    enum: TeamActivityType,
  })
  activityType: TeamActivityType;

  @Column({ name: "entity_type", type: "varchar", length: 50 })
  entityType: string;

  @Column({ name: "entity_id", type: "int", nullable: true })
  entityId: number | null;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "is_visible_to_team", default: true })
  isVisibleToTeam: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
