import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_talent_pools")
@Index(["companyId"])
export class AnnixOrbitTalentPool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "candidate_ids", type: "jsonb", nullable: true })
  candidateIds: number[] | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
