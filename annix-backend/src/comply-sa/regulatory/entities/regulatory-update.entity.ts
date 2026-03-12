import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("comply_sa_regulatory_updates")
export class ComplySaRegulatoryUpdate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  summary!: string;

  @Column({ type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "effective_date", type: "varchar", length: 50, nullable: true })
  effectiveDate!: string | null;

  @Column({ name: "source_url", type: "varchar", length: 500, nullable: true })
  sourceUrl!: string | null;

  @Column({ name: "affected_requirement_codes", type: "jsonb", nullable: true })
  affectedRequirementCodes!: string[] | null;

  @CreateDateColumn({ name: "published_at" })
  publishedAt!: Date;
}
