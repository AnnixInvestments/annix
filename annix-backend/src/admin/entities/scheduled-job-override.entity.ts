import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("scheduled_job_overrides")
export class ScheduledJobOverride {
  @PrimaryColumn({ type: "varchar", length: 100 })
  jobName: string;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  cronExpression: string | null;
}
