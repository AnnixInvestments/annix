import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_seeker_test_issues")
export class SeekerTestingIssue {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "int", nullable: true })
  userId: number | null;

  @Column({ name: "phase_id", type: "varchar", length: 160, nullable: true })
  phaseId: string | null;

  @Column({ name: "page", type: "varchar", length: 160, nullable: true })
  page: string | null;

  @Column({ name: "workflow_step", type: "varchar", length: 160, nullable: true })
  workflowStep: string | null;

  @Column({ name: "severity", type: "varchar", length: 40, default: "medium" })
  severity: string;

  @Column({ name: "title", type: "varchar", length: 200 })
  title: string;

  @Column({ name: "description", type: "text" })
  description: string;

  @Column({ name: "screenshot_url", type: "varchar", length: 500, nullable: true })
  screenshotUrl: string | null;

  @Column({ name: "status", type: "varchar", length: 40, default: "open" })
  status: string;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
