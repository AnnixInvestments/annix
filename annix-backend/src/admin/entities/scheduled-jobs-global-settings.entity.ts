import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("scheduled_jobs_global_settings")
export class ScheduledJobsGlobalSettings {
  @PrimaryColumn({ type: "varchar", length: 50, default: "default" })
  settingsKey: string;

  @Column({ type: "boolean", default: true })
  suspendOnWeekendsAndHolidays: boolean;

  @Column({ type: "boolean", default: false })
  pauseAllJobs: boolean;
}
