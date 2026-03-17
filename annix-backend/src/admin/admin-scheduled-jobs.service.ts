import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { CronTime } from "cron";
import { Repository } from "typeorm";
import { ScheduledJobOverride } from "./entities/scheduled-job-override.entity";

export interface ScheduledJobDto {
  name: string;
  description: string;
  module: string;
  active: boolean;
  cronTime: string;
  lastExecution: string | null;
  nextExecution: string | null;
}

const JOB_METADATA: Record<string, { description: string; module: string }> = {
  "fieldflow:sync-meetings": {
    description: "Sync completed meetings from calendar providers",
    module: "FieldFlow",
  },
  "fieldflow:download-recordings": {
    description: "Download pending meeting recordings",
    module: "FieldFlow",
  },
  "fieldflow:refresh-tokens": {
    description: "Refresh expiring OAuth tokens for integrations",
    module: "FieldFlow",
  },
  "fieldflow:weekly-full-sync": {
    description: "Full weekly sync of all meeting data",
    module: "FieldFlow",
  },
  "fieldflow:cleanup-old-records": {
    description: "Clean up old meeting and recording records",
    module: "FieldFlow",
  },
  "fieldflow:daily-reminders": {
    description: "Send daily follow-up reminder emails",
    module: "FieldFlow",
  },
  "fieldflow:crm-sync": {
    description: "Sync CRM data (Salesforce, HubSpot, Pipedrive)",
    module: "FieldFlow",
  },
  "fieldflow:calendar-sync": {
    description: "Sync active calendar connections",
    module: "FieldFlow",
  },
  "cv-assistant:purge-inactive": {
    description: "POPIA purge of inactive candidate data",
    module: "CV Assistant",
  },
  "cv-assistant:poll-emails": {
    description: "Poll inbound emails for CV submissions",
    module: "CV Assistant",
  },
  "cv-assistant:poll-job-sources": {
    description: "Poll external job listing sources",
    module: "CV Assistant",
  },
  "cv-assistant:weekly-digests": {
    description: "Send weekly candidate digest emails",
    module: "CV Assistant",
  },
  "cv-assistant:job-alerts": {
    description: "Send daily candidate job alert emails",
    module: "CV Assistant",
  },
  "customers:bee-expiry-check": {
    description: "Check B-BEE certificate expiry and send notifications",
    module: "Customers",
  },
  "comply-sa:regulatory-sync": {
    description: "Sync regulatory updates from government sources",
    module: "Comply SA",
  },
  "comply-sa:deadline-notifications": {
    description: "Process compliance deadline notifications",
    module: "Comply SA",
  },
  "comply-sa:document-expiry": {
    description: "Check document expiry and send warnings",
    module: "Comply SA",
  },
  "inbound-email:poll-all": {
    description: "Poll all configured inbound email accounts",
    module: "Inbound Email",
  },
  "au-rubber:poll-emails": {
    description: "Poll AU Rubber inbound emails for CoCs and DNs",
    module: "AU Rubber",
  },
  "secure-docs:cleanup-deleted": {
    description: "Permanently delete soft-deleted secure document folders",
    module: "Secure Docs",
  },
  "stock-control:calibration-expiry": {
    description: "Check calibration certificate expiry notifications",
    module: "Stock Control",
  },
  "stock-control:uninvoiced-arrivals": {
    description: "Check for CPO arrivals without matching invoices",
    module: "Stock Control",
  },
};

@Injectable()
export class AdminScheduledJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminScheduledJobsService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(ScheduledJobOverride)
    private readonly overrideRepo: Repository<ScheduledJobOverride>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const overrides = await this.overrideRepo.find();

    overrides.forEach((override) => {
      try {
        const job = this.schedulerRegistry.getCronJob(override.jobName);

        if (override.cronExpression) {
          job.setTime(new CronTime(override.cronExpression));
          this.logger.log(`Restored frequency for ${override.jobName}: ${override.cronExpression}`);
        }

        if (override.active) {
          job.start();
        } else {
          job.stop();
          this.logger.log(`Restored paused state for ${override.jobName}`);
        }
      } catch {
        this.logger.warn(`Skipping override for unknown job: ${override.jobName}`);
      }
    });

    if (overrides.length > 0) {
      this.logger.log(`Applied ${overrides.length} scheduled job override(s) from database`);
    }
  }

  allJobs(): ScheduledJobDto[] {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    return Array.from(cronJobs.entries()).map(([name, job]) => this.jobToDto(name, job));
  }

  async pauseJob(name: string): Promise<ScheduledJobDto> {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
    await this.overrideRepo.save({ jobName: name, active: false });
    this.logger.log(`Paused cron job: ${name}`);
    return this.jobToDto(name, job);
  }

  async resumeJob(name: string): Promise<ScheduledJobDto> {
    const job = this.schedulerRegistry.getCronJob(name);
    job.start();
    await this.overrideRepo.save({ jobName: name, active: true });
    this.logger.log(`Resumed cron job: ${name}`);
    return this.jobToDto(name, job);
  }

  async updateFrequency(name: string, cronExpression: string): Promise<ScheduledJobDto> {
    const job = this.schedulerRegistry.getCronJob(name);
    job.setTime(new CronTime(cronExpression));
    if (job.isActive) {
      job.start();
    }

    const existing = await this.overrideRepo.findOne({ where: { jobName: name } });
    await this.overrideRepo.save({
      jobName: name,
      active: existing?.active ?? job.isActive,
      cronExpression,
    });

    this.logger.log(`Updated cron job ${name} to: ${cronExpression}`);
    return this.jobToDto(name, job);
  }

  private jobToDto(name: string, job: any): ScheduledJobDto {
    const meta = JOB_METADATA[name] || { description: name, module: "Unknown" };
    return {
      name,
      description: meta.description,
      module: meta.module,
      active: job.isActive,
      cronTime: String(job.cronTime.source),
      lastExecution: job.lastExecution ? job.lastExecution.toISOString() : null,
      nextExecution: String(job.nextDate().toISO()),
    };
  }
}
