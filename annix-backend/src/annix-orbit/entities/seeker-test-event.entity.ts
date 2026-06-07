import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_seeker_events")
@Index("idx_orbit_seeker_events_candidate", ["candidateId"])
@Index("idx_orbit_seeker_events_name", ["eventName"])
@Index("idx_orbit_seeker_events_ts", ["ts"])
@Index("idx_orbit_seeker_events_phase", ["phaseId"])
export class SeekerTestEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "candidate_id", type: "int", nullable: true })
  candidateId: number | null;

  @Column({ name: "event_name", type: "varchar", length: 200 })
  eventName: string;

  @Column({ name: "ts", type: "timestamptz" })
  ts: Date;

  @Column({ name: "duration_ms", type: "int", nullable: true })
  durationMs: number | null;

  @Column({ name: "ok", type: "boolean", default: true })
  ok: boolean;

  @Column({ name: "error_message", type: "varchar", length: 1000, nullable: true })
  errorMessage: string | null;

  @Column({ name: "page", type: "varchar", length: 200, nullable: true })
  page: string | null;

  @Column({ name: "phase_id", type: "varchar", length: 120, nullable: true })
  phaseId: string | null;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
