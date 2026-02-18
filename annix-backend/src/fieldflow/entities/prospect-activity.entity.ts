import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Prospect } from "./prospect.entity";

export enum ProspectActivityType {
  CREATED = "created",
  STATUS_CHANGE = "status_change",
  NOTE_ADDED = "note_added",
  FOLLOW_UP_COMPLETED = "follow_up_completed",
  FIELD_UPDATED = "field_updated",
  TAG_ADDED = "tag_added",
  TAG_REMOVED = "tag_removed",
  MERGED = "merged",
  CONTACTED = "contacted",
}

@Entity("annix_rep_prospect_activities")
export class ProspectActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prospect, { onDelete: "CASCADE" })
  @JoinColumn({ name: "prospect_id" })
  prospect: Prospect;

  @Column({ name: "prospect_id" })
  prospectId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({
    name: "activity_type",
    type: "enum",
    enum: ProspectActivityType,
  })
  activityType: ProspectActivityType;

  @Column({ name: "old_values", type: "json", nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: "new_values", type: "json", nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
