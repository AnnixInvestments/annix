import { Injectable, Logger } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronTime } from "cron";

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
export class AdminScheduledJobsService {
  private readonly logger = new Logger(AdminScheduledJobsService.name);

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  allJobs(): ScheduledJobDto[] {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    return Array.from(cronJobs.entries()).map(([name, job]) => this.jobToDto(name, job));
  }

  pauseJob(name: string): ScheduledJobDto {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
    this.logger.log(`Paused cron job: ${name}`);
    return this.jobToDto(name, job);
  }

  resumeJob(name: string): ScheduledJobDto {
    const job = this.schedulerRegistry.getCronJob(name);
    job.start();
    this.logger.log(`Resumed cron job: ${name}`);
    return this.jobToDto(name, job);
  }

  updateFrequency(name: string, cronExpression: string): ScheduledJobDto {
    const job = this.schedulerRegistry.getCronJob(name);
    job.setTime(new CronTime(cronExpression));
    if (job.isActive) {
      job.start();
    }
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
