import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("cv_assistant_job_analysis_cache")
export class JobAnalysisCache {
  @PrimaryColumn({ name: "cache_key", type: "varchar", length: 600 })
  cacheKey: string;

  @Column({ name: "category", type: "varchar", length: 100, nullable: true })
  category: string | null;

  @Column({ name: "skills", type: "jsonb", default: () => "'[]'" })
  skills: string[];

  @CreateDateColumn({ name: "analyzed_at" })
  analyzedAt: Date;
}
