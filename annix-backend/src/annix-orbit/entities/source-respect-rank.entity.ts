import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

// How "respected" each job source is, used to decide which copy of a duplicate
// listing to keep (higher rank = kept). Researched defaults are seeded by
// migration; rows can be re-ranked at runtime without a code change.
@Entity("cv_assistant_source_respect_ranks")
export class SourceRespectRank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "provider", type: "varchar", length: 50, unique: true })
  provider: string;

  @Column({ name: "rank", type: "int" })
  rank: number;

  @Column({ name: "label", type: "varchar", length: 255, nullable: true })
  label: string | null;

  @Column({ name: "rationale", type: "text", nullable: true })
  rationale: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
