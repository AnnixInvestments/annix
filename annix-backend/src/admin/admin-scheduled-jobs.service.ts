import { Injectable, Logger } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronTime } from "cron";

export interface ScheduledJobDto {
  name: string;
  active: boolean;
  cronTime: string;
  lastExecution: string | null;
  nextExecution: string | null;
}

@Injectable()
export class AdminScheduledJobsService {
  private readonly logger = new Logger(AdminScheduledJobsService.name);

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  allJobs(): ScheduledJobDto[] {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    return Array.from(cronJobs.entries()).map(([name, job]) => ({
      name,
      active: job.isActive,
      cronTime: String(job.cronTime.source),
      lastExecution: job.lastExecution ? job.lastExecution.toISOString() : null,
      nextExecution: String(job.nextDate().toISO()),
    }));
  }

  pauseJob(name: string): ScheduledJobDto {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
    this.logger.log(`Paused cron job: ${name}`);
    return {
      name,
      active: job.isActive,
      cronTime: String(job.cronTime.source),
      lastExecution: job.lastExecution ? job.lastExecution.toISOString() : null,
      nextExecution: String(job.nextDate().toISO()),
    };
  }

  resumeJob(name: string): ScheduledJobDto {
    const job = this.schedulerRegistry.getCronJob(name);
    job.start();
    this.logger.log(`Resumed cron job: ${name}`);
    return {
      name,
      active: job.isActive,
      cronTime: String(job.cronTime.source),
      lastExecution: job.lastExecution ? job.lastExecution.toISOString() : null,
      nextExecution: String(job.nextDate().toISO()),
    };
  }

  updateFrequency(name: string, cronExpression: string): ScheduledJobDto {
    const job = this.schedulerRegistry.getCronJob(name);
    job.setTime(new CronTime(cronExpression));
    if (job.isActive) {
      job.start();
    }
    this.logger.log(`Updated cron job ${name} to: ${cronExpression}`);
    return {
      name,
      active: job.isActive,
      cronTime: String(job.cronTime.source),
      lastExecution: job.lastExecution ? job.lastExecution.toISOString() : null,
      nextExecution: String(job.nextDate().toISO()),
    };
  }
}
