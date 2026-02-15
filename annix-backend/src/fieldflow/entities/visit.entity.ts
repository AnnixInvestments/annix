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

export enum VisitType {
  COLD_CALL = "cold_call",
  SCHEDULED = "scheduled",
  FOLLOW_UP = "follow_up",
  DROP_IN = "drop_in",
}

export enum VisitOutcome {
  SUCCESSFUL = "successful",
  NO_ANSWER = "no_answer",
  RESCHEDULED = "rescheduled",
  NOT_INTERESTED = "not_interested",
  FOLLOW_UP_REQUIRED = "follow_up_required",
  CONVERTED = "converted",
}

@Entity("fieldflow_visits")
export class Visit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prospect, { onDelete: "CASCADE" })
  @JoinColumn({ name: "prospect_id" })
  prospect: Prospect;

  @Column({ name: "prospect_id" })
  prospectId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sales_rep_id" })
  salesRep: User;

  @Column({ name: "sales_rep_id" })
  salesRepId: number;

  @Column({
    name: "visit_type",
    type: "enum",
    enum: VisitType,
    default: VisitType.SCHEDULED,
  })
  visitType: VisitType;

  @Column({ name: "scheduled_at", type: "timestamp", nullable: true })
  scheduledAt: Date | null;

  @Column({ name: "started_at", type: "timestamp", nullable: true })
  startedAt: Date | null;

  @Column({ name: "ended_at", type: "timestamp", nullable: true })
  endedAt: Date | null;

  @Column({ name: "check_in_latitude", type: "decimal", precision: 10, scale: 7, nullable: true })
  checkInLatitude: number | null;

  @Column({ name: "check_in_longitude", type: "decimal", precision: 10, scale: 7, nullable: true })
  checkInLongitude: number | null;

  @Column({ name: "check_out_latitude", type: "decimal", precision: 10, scale: 7, nullable: true })
  checkOutLatitude: number | null;

  @Column({ name: "check_out_longitude", type: "decimal", precision: 10, scale: 7, nullable: true })
  checkOutLongitude: number | null;

  @Column({
    type: "enum",
    enum: VisitOutcome,
    nullable: true,
  })
  outcome: VisitOutcome | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "contact_met", type: "varchar", length: 255, nullable: true })
  contactMet: string | null;

  @Column({ name: "next_steps", type: "text", nullable: true })
  nextSteps: string | null;

  @Column({ name: "follow_up_date", type: "date", nullable: true })
  followUpDate: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
