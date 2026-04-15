import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("polling_job_overrides")
export class PollingJobOverride {
  @PrimaryColumn({ type: "varchar", length: 100 })
  jobName: string;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @Column({ type: "integer", nullable: true })
  intervalMs: number | null;

  @Column({ type: "smallint", nullable: true })
  nightSuspensionHours: number | null;
}
