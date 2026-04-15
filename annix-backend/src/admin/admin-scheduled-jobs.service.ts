import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { CronTime } from "cron";
import { DateTime } from "luxon";
import { Repository } from "typeorm";
import { isSAPublicHoliday } from "../lib/sa-public-holidays";
import { ScheduledJobOverride } from "./entities/scheduled-job-override.entity";
import { ScheduledJobsGlobalSettings } from "./entities/scheduled-jobs-global-settings.entity";

export type NightSuspensionHours = 6 | 8 | 12 | null;

export interface ScheduledJobDto {
  name: string;
  description: string;
  module: string;
  active: boolean;
  cronTime: string;
  defaultCron: string;
  lastExecution: string | null;
  nextExecution: string | null;
  nightSuspensionHours: NightSuspensionHours;
}

export interface ScheduledJobExportDto {
  jobName: string;
  active: boolean;
  cronExpression: string | null;
  nightSuspensionHours: NightSuspensionHours;
}

export interface GlobalSettingsDto {
  suspendOnWeekendsAndHolidays: boolean;
}

export interface SyncResultDto {
  synced: number;
  source: string;
  timestamp: string;
}

const JOB_METADATA: Record<string, { description: string; module: string; defaultCron: string }> = {
  "fieldflow:sync-meetings": {
    description: "Sync completed meetings from calendar providers",
    module: "FieldFlow",
    defaultCron: "*/30 * * * *",
  },
  "fieldflow:download-recordings": {
    description: "Download pending meeting recordings",
    module: "FieldFlow",
    defaultCron: "*/30 * * * *",
  },
  "fieldflow:refresh-tokens": {
    description: "Refresh expiring OAuth tokens for integrations",
    module: "FieldFlow",
    defaultCron: "0 * * * *",
  },
  "fieldflow:weekly-full-sync": {
    description: "Full weekly sync of all meeting data",
    module: "FieldFlow",
    defaultCron: "0 2 * * *",
  },
  "fieldflow:cleanup-old-records": {
    description: "Clean up old meeting and recording records",
    module: "FieldFlow",
    defaultCron: "0 3 * * *",
  },
  "fieldflow:daily-reminders": {
    description: "Send daily follow-up reminder emails",
    module: "FieldFlow",
    defaultCron: "0 8 * * *",
  },
  "fieldflow:crm-sync": {
    description: "Sync CRM data (Salesforce, HubSpot, Pipedrive)",
    module: "FieldFlow",
    defaultCron: "*/30 * * * *",
  },
  "fieldflow:calendar-sync": {
    description: "Sync active calendar connections",
    module: "FieldFlow",
    defaultCron: "*/30 * * * *",
  },
  "cv-assistant:purge-inactive": {
    description: "POPIA purge of inactive candidate data",
    module: "CV Assistant",
    defaultCron: "0 2 * * *",
  },
  "cv-assistant:poll-emails": {
    description: "Poll inbound emails for CV submissions",
    module: "CV Assistant",
    defaultCron: "0 6-18 * * *",
  },
  "cv-assistant:poll-job-sources": {
    description: "Poll external job listing sources",
    module: "CV Assistant",
    defaultCron: "0 * * * *",
  },
  "cv-assistant:weekly-digests": {
    description: "Send weekly candidate digest emails",
    module: "CV Assistant",
    defaultCron: "0 0 * * 0",
  },
  "cv-assistant:job-alerts": {
    description: "Send daily candidate job alert emails",
    module: "CV Assistant",
    defaultCron: "0 9 * * *",
  },
  "customers:bee-expiry-check": {
    description: "Check B-BEE certificate expiry and send notifications",
    module: "Customers",
    defaultCron: "0 8 * * *",
  },
  "comply-sa:regulatory-sync": {
    description: "Sync regulatory updates from government sources",
    module: "Comply SA",
    defaultCron: "0 5 * * *",
  },
  "comply-sa:deadline-notifications": {
    description: "Process compliance deadline notifications",
    module: "Comply SA",
    defaultCron: "0 6 * * *",
  },
  "comply-sa:document-expiry": {
    description: "Check document expiry and send warnings",
    module: "Comply SA",
    defaultCron: "0 7 * * *",
  },
  "comply-sa:data-retention-cleanup": {
    description: "Monthly POPIA data retention cleanup for Comply SA",
    module: "Comply SA",
    defaultCron: "0 3 1 * *",
  },
  "inbound-email:poll-all": {
    description:
      "Poll all configured inbound email accounts (polymer-app@annix.co.za, au-rubber-app@annix.co.za)",
    module: "Inbound Email",
    defaultCron: "0 6-18 * * *",
  },
  "au-rubber:poll-emails": {
    description: "Poll AU Rubber inbound emails for CoCs and DNs (au-rubber-app@annix.co.za)",
    module: "AU Rubber",
    defaultCron: "0 6-18 * * *",
  },
  "secure-docs:cleanup-deleted": {
    description: "Permanently delete soft-deleted secure document folders",
    module: "Secure Docs",
    defaultCron: "0 2 * * *",
  },
  "stock-control:calibration-expiry": {
    description: "Check calibration certificate expiry notifications",
    module: "Stock Control",
    defaultCron: "0 8 * * *",
  },
  "stock-control:uninvoiced-arrivals": {
    description: "Check for CPO arrivals without matching invoices",
    module: "Stock Control",
    defaultCron: "0 8 * * *",
  },
  "scheduled-jobs:sync-from-prod": {
    description: "Sync scheduled job settings from production server",
    module: "Admin",
    defaultCron: "0 * * * *",
  },
  "stock-management:monthly-snapshot": {
    description:
      "Monthly stock take snapshot — captures every product's quantity and cost at midnight on the 1st of the month, then attaches the snapshot to a draft stock take session (or creates a new one)",
    module: "Stock Management",
    defaultCron: "0 0 1 * *",
  },
};

const NIGHT_SUSPENSION_WINDOWS: Record<number, { start: number; end: number }> = {
  6: { start: 21, end: 3 },
  8: { start: 20, end: 4 },
  12: { start: 18, end: 6 },
};

@Injectable()
export class AdminScheduledJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminScheduledJobsService.name);
  private readonly syncSource: string | null;
  private readonly syncToken: string | null;
  private lastSyncTimestamp: string | null = null;
  private suspendOnWeekendsAndHolidays = true;
  private nightSuspensionByJob = new Map<string, NightSuspensionHours>();

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(ScheduledJobOverride)
    private readonly overrideRepo: Repository<ScheduledJobOverride>,
    @InjectRepository(ScheduledJobsGlobalSettings)
    private readonly globalSettingsRepo: Repository<ScheduledJobsGlobalSettings>,
    private readonly configService: ConfigService,
  ) {
    this.syncSource = this.configService.get<string>("SCHEDULED_JOBS_SYNC_SOURCE") || null;
    this.syncToken = this.configService.get<string>("SCHEDULED_JOBS_SYNC_TOKEN") || null;
  }

  async onApplicationBootstrap(): Promise<void> {
    const globalSettings = await this.globalSettingsRepo.findOne({
      where: { settingsKey: "default" },
    });
    if (globalSettings) {
      this.suspendOnWeekendsAndHolidays = globalSettings.suspendOnWeekendsAndHolidays;
    }
    this.logger.log(
      `Weekend/holiday suspension: ${this.suspendOnWeekendsAndHolidays ? "ENABLED" : "DISABLED"}${!globalSettings ? " (default — no global settings row found)" : ""}`,
    );

    if (this.syncSource) {
      try {
        await this.syncFromSource();
      } catch (err) {
        this.logger.warn(
          `Failed to sync scheduled jobs from ${this.syncSource} on startup: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }

    const overrides = await this.overrideRepo.find();
    const overridesByName = new Map(overrides.map((o) => [o.jobName, o]));

    Object.entries(JOB_METADATA).forEach(([name, meta]) => {
      try {
        const job = this.schedulerRegistry.getCronJob(name);
        const override = overridesByName.get(name);

        if (override) {
          if (override.cronExpression) {
            job.setTime(new CronTime(override.cronExpression));
            this.logger.log(`Restored frequency for ${name}: ${override.cronExpression}`);
          }

          if (override.nightSuspensionHours) {
            this.nightSuspensionByJob.set(
              name,
              override.nightSuspensionHours as NightSuspensionHours,
            );
          }

          if (override.active) {
            job.start();
          } else {
            job.stop();
            this.logger.log(`Restored paused state for ${name}`);
          }
        } else {
          job.setTime(new CronTime(meta.defaultCron));
          this.logger.log(`Applied default frequency for ${name}: ${meta.defaultCron}`);
        }
      } catch {
        this.logger.warn(`Skipping bootstrap for unregistered job: ${name}`);
      }
    });

    this.wrapCronJobsWithGuard();

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

  async updateNightSuspension(
    name: string,
    nightSuspensionHours: NightSuspensionHours,
  ): Promise<ScheduledJobDto> {
    const job = this.schedulerRegistry.getCronJob(name);
    this.nightSuspensionByJob.set(name, nightSuspensionHours);

    const existing = await this.overrideRepo.findOne({ where: { jobName: name } });
    await this.overrideRepo.save({
      jobName: name,
      active: existing?.active ?? job.isActive,
      cronExpression: existing?.cronExpression || null,
      nightSuspensionHours,
    });

    this.logger.log(`Updated night suspension for ${name}: ${nightSuspensionHours || "none"}`);
    return this.jobToDto(name, job);
  }

  globalSettings(): GlobalSettingsDto {
    return { suspendOnWeekendsAndHolidays: this.suspendOnWeekendsAndHolidays };
  }

  async updateGlobalSettings(settings: GlobalSettingsDto): Promise<GlobalSettingsDto> {
    this.suspendOnWeekendsAndHolidays = settings.suspendOnWeekendsAndHolidays;
    await this.globalSettingsRepo.save({
      settingsKey: "default",
      suspendOnWeekendsAndHolidays: settings.suspendOnWeekendsAndHolidays,
    });
    this.logger.log(
      `Updated global settings: suspendOnWeekendsAndHolidays=${settings.suspendOnWeekendsAndHolidays}`,
    );
    return settings;
  }

  validateSyncToken(token: string | null): boolean {
    return Boolean(this.syncToken) && token === this.syncToken;
  }

  async exportOverrides(): Promise<ScheduledJobExportDto[]> {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    return Array.from(cronJobs.entries()).map(([name, job]) => ({
      jobName: name,
      active: job.isActive,
      cronExpression: this.normalizeCronToFiveField(String(job.cronTime.source)),
      nightSuspensionHours: this.nightSuspensionByJob.get(name) || null,
    }));
  }

  async syncFromSource(): Promise<SyncResultDto> {
    if (!this.syncSource) {
      throw new Error("SCHEDULED_JOBS_SYNC_SOURCE is not configured");
    }

    const url = `${this.syncSource}/admin/scheduled-jobs/export`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.syncToken) {
      headers["x-sync-token"] = this.syncToken;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const remoteOverrides: ScheduledJobExportDto[] = await response.json();
    let synced = 0;

    for (const remote of remoteOverrides) {
      try {
        const job = this.schedulerRegistry.getCronJob(remote.jobName);

        await this.overrideRepo.save({
          jobName: remote.jobName,
          active: remote.active,
          cronExpression: remote.cronExpression,
          nightSuspensionHours: remote.nightSuspensionHours,
        });

        if (remote.cronExpression) {
          job.setTime(new CronTime(remote.cronExpression));
        }

        if (remote.nightSuspensionHours) {
          this.nightSuspensionByJob.set(remote.jobName, remote.nightSuspensionHours);
        } else {
          this.nightSuspensionByJob.delete(remote.jobName);
        }

        if (remote.active) {
          job.start();
        } else {
          job.stop();
        }

        synced++;
      } catch {
        this.logger.warn(`Skipping sync for unknown local job: ${remote.jobName}`);
      }
    }

    this.lastSyncTimestamp = new Date().toISOString();
    this.logger.log(`Synced ${synced} scheduled job override(s) from ${this.syncSource}`);

    return {
      synced,
      source: this.syncSource,
      timestamp: this.lastSyncTimestamp,
    };
  }

  syncStatus(): { syncSource: string | null; lastSyncTimestamp: string | null } {
    return {
      syncSource: this.syncSource,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }

  @Cron(CronExpression.EVERY_HOUR, { name: "scheduled-jobs:sync-from-prod" })
  async periodicSync(): Promise<void> {
    if (!this.syncSource) {
      return;
    }

    try {
      await this.syncFromSource();
    } catch (err) {
      this.logger.warn(`Periodic sync failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
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

  shouldJobRun(jobName: string): boolean {
    const now = DateTime.now().setZone("Africa/Johannesburg");

    if (this.suspendOnWeekendsAndHolidays) {
      if (now.weekday >= 6 || isSAPublicHoliday(now)) {
        this.logger.debug(`Skipping ${jobName}: suspended on weekends/public holidays`);
        return false;
      }
    }

    const suspension = this.nightSuspensionByJob.get(jobName);
    if (suspension) {
      const window = NIGHT_SUSPENSION_WINDOWS[suspension];
      if (window) {
        const hour = now.hour;
        const suspended =
          window.start > window.end
            ? hour >= window.start || hour < window.end
            : hour >= window.start && hour < window.end;
        if (suspended) {
          this.logger.debug(`Skipping ${jobName}: night suspension (${suspension}h) active`);
          return false;
        }
      }
    }

    return true;
  }

  private wrapCronJobsWithGuard(): void {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    for (const [name, job] of cronJobs.entries()) {
      if (!JOB_METADATA[name]) {
        continue;
      }

      const originalOnTick = (job as any)._callbacks?.[0] || (job as any).onTick;
      if (!originalOnTick) {
        continue;
      }

      const service = this;
      const wrappedTick = function (this: any, ...args: any[]) {
        if (!service.shouldJobRun(name)) {
          return;
        }
        return originalOnTick.apply(this, args);
      };

      if ((job as any)._callbacks) {
        (job as any)._callbacks[0] = wrappedTick;
      }
    }
    this.logger.log("Wrapped all cron jobs with night/holiday suspension guard");
  }

  private normalizeCronToFiveField(cronSource: string): string {
    const parts = cronSource.trim().split(/\s+/);
    const fiveField = parts.length === 6 ? parts.slice(1).join(" ") : parts.join(" ");

    const equivalents: Record<string, string> = {
      "0 0-23/1 * * *": "0 * * * *",
      "*/1 * * * *": "* * * * *",
    };

    const mapped = equivalents[fiveField] || fiveField;
    return mapped.replace(/\b0(\d)\b/g, "$1");
  }

  private jobToDto(name: string, job: any): ScheduledJobDto {
    const meta = JOB_METADATA[name] || {
      description: name,
      module: "Unknown",
      defaultCron: "0 * * * *",
    };
    return {
      name,
      description: meta.description,
      module: meta.module,
      active: job.isActive,
      cronTime: this.normalizeCronToFiveField(String(job.cronTime.source)),
      defaultCron: meta.defaultCron,
      lastExecution: job.lastExecution ? job.lastExecution.toISOString() : null,
      nextExecution: String(job.nextDate().toISO()),
      nightSuspensionHours: this.nightSuspensionByJob.get(name) || null,
    };
  }
}
