import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_seeker_test_participants")
export class SeekerTestParticipant {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "candidate_id", type: "int" })
  candidateId: number;

  @Column({ name: "phase_id", type: "varchar", length: 200 })
  phaseId: string;

  @Column({ name: "role", type: "varchar", length: 80, default: "seeker" })
  role: string;

  @Column({ name: "joined_at", type: "timestamptz" })
  joinedAt: Date;

  @Column({ name: "status", type: "varchar", length: 80, default: "active" })
  status: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
