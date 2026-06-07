import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_seeker_test_phases")
export class SeekerTestPhase {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "name", type: "varchar", length: 200 })
  name: string;

  @Column({ name: "start_date", type: "timestamptz", nullable: true })
  startDate: Date | null;

  @Column({ name: "end_date", type: "timestamptz", nullable: true })
  endDate: Date | null;

  @Column({ name: "status", type: "varchar", length: 40, default: "pending" })
  status: string;

  @Column({ name: "target_users", type: "int", default: 0 })
  targetUsers: number;

  @Column({ name: "actual_users", type: "int", default: 0 })
  actualUsers: number;

  @Column({ name: "notes", type: "varchar", length: 2000, nullable: true })
  notes: string | null;

  @Column({ name: "readiness_percentage", type: "int", default: 0 })
  readinessPercentage: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
