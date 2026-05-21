import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("cv_assistant_esco_skills")
@Index("ux_esco_skills_uri", ["escoUri"], { unique: true })
export class CvEscoSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "esco_uri", type: "varchar", length: 500 })
  escoUri: string;

  @Column({ name: "preferred_label", type: "varchar", length: 500 })
  preferredLabel: string;

  @Column({ name: "alt_labels", type: "jsonb", default: () => "'[]'::jsonb" })
  altLabels: string[];

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
