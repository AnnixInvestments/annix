import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ExternalJob } from "./external-job.entity";
import { JobMarketSource } from "./job-market-source.entity";

@Entity("cv_assistant_external_job_alternates")
@Index("ux_alt_source_external", ["sourceId", "sourceExternalId"], { unique: true })
@Index("idx_alt_canonical_job", ["canonicalExternalJobId"])
export class ExternalJobAlternate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ExternalJob, { onDelete: "CASCADE" })
  @JoinColumn({ name: "canonical_external_job_id" })
  canonicalJob: ExternalJob;

  @Column({ name: "canonical_external_job_id" })
  canonicalExternalJobId: number;

  @ManyToOne(() => JobMarketSource, { onDelete: "CASCADE" })
  @JoinColumn({ name: "source_id" })
  source: JobMarketSource;

  @Column({ name: "source_id" })
  sourceId: number;

  @Column({ name: "source_external_id", type: "varchar", length: 255 })
  sourceExternalId: string;

  @Column({ name: "source_url", type: "varchar", length: 1000, nullable: true })
  sourceUrl: string | null;

  @Column({ type: "varchar", length: 500 })
  title: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  company: string | null;

  @Column({ name: "location_area", type: "varchar", length: 255, nullable: true })
  locationArea: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
