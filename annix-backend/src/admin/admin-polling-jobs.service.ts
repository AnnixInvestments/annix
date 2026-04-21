import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DateTime } from "../lib/datetime";
import { isSAPublicHoliday } from "../lib/sa-public-holidays";
import { PollingJobOverride } from "./entities/polling-job-override.entity";
import { PollingJobsGlobalSettings } from "./entities/polling-jobs-global-settings.entity";

export type NightSuspensionHours = 6 | 8 | 12 | null;

export interface PollingJobDto {
  name: string;
  description: string;
  module: string;
  active: boolean;
  intervalMs: number;
  defaultIntervalMs: number;
  nightSuspensionHours: NightSuspensionHours;
}

export interface PollingJobsGlobalSettingsDto {
  suspendOnWeekendsAndHolidays: boolean;
}

export interface PollingJobRuntimeConfigDto {
  jobs: Record<
    string,
    {
      active: boolean;
      intervalMs: number;
      nightSuspensionHours: NightSuspensionHours;
      suspendedNow: boolean;
    }
  >;
  suspendOnWeekendsAndHolidays: boolean;
  serverTime: string;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export const POLLING_JOB_METADATA: Record<
  string,
  { description: string; module: string; defaultIntervalMs: number }
> = {
  "dashboard:workflow-lane-counts": {
    description: "Stock Control dashboard — workflow lane counts",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:stats": {
    description: "Stock Control dashboard — headline stats",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:soh-by-location": {
    description: "Stock Control dashboard — stock-on-hand by location",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:soh-summary": {
    description: "Stock Control dashboard — stock-on-hand summary",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:recent-activity": {
    description: "Stock Control dashboard — recent activity feed",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:reorder-alerts": {
    description: "Stock Control dashboard — reorder alerts",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:pending-approvals": {
    description: "Stock Control dashboard — pending approvals",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:cpo-summary": {
    description: "Stock Control dashboard — CPO summary",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "dashboard:role-summary": {
    description: "Stock Control dashboard — role summary",
    module: "Stock Control Dashboard",
    defaultIntervalMs: SIX_HOURS,
  },
  "admin:scheduled-jobs-list": {
    description: "Admin scheduled-jobs page — jobs list",
    module: "Admin",
    defaultIntervalMs: SIX_HOURS,
  },
  "admin:scheduled-jobs-sync-status": {
    description: "Admin scheduled-jobs page — sync status",
    module: "Admin",
    defaultIntervalMs: SIX_HOURS,
  },
  "admin:scheduled-jobs-global-settings": {
    description: "Admin scheduled-jobs page — global settings",
    module: "Admin",
    defaultIntervalMs: SIX_HOURS,
  },
  "annix-rep:crm": {
    description: "Annix Rep — CRM poll",
    module: "Annix Rep",
    defaultIntervalMs: SIX_HOURS,
  },
  "stock-control:notification-count": {
    description: "Stock Control — notification badge count",
    module: "Stock Control",
    defaultIntervalMs: SIX_HOURS,
  },
};

const NIGHT_SUSPENSION_WINDOWS: Record<number, { start: number; end: number }> = {
  6: { start: 21, end: 3 },
  8: { start: 20, end: 4 },
  12: { start: 18, end: 6 },
};

@Injectable()
export class AdminPollingJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminPollingJobsService.name);
  private suspendOnWeekendsAndHolidays = true;
  private overridesByJob = new Map<string, PollingJobOverride>();

  constructor(
    @InjectRepository(PollingJobOverride)
    private readonly overrideRepo: Repository<PollingJobOverride>,
    @InjectRepository(PollingJobsGlobalSettings)
    private readonly globalSettingsRepo: Repository<PollingJobsGlobalSettings>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.reloadOverrides();
    const globalSettings = await this.globalSettingsRepo.findOne({
      where: { settingsKey: "default" },
    });
    this.suspendOnWeekendsAndHolidays = globalSettings?.suspendOnWeekendsAndHolidays ?? true;
    this.logger.log(
      `Loaded ${this.overridesByJob.size} polling-job overrides. Weekend/holiday suspension: ${this.suspendOnWeekendsAndHolidays ? "ENABLED" : "DISABLED"}`,
    );
  }

  private async reloadOverrides(): Promise<void> {
    const rows = await this.overrideRepo.find();
    this.overridesByJob = new Map(rows.map((row) => [row.jobName, row]));
  }

  private nightSuspensionFor(jobName: string): NightSuspensionHours {
    const override = this.overridesByJob.get(jobName);
    const value = override?.nightSuspensionHours ?? 12;
    if (value === 6 || value === 8 || value === 12) return value;
    return null;
  }

  private intervalFor(jobName: string): number {
    const override = this.overridesByJob.get(jobName);
    if (override?.intervalMs != null) return override.intervalMs;
    return POLLING_JOB_METADATA[jobName]?.defaultIntervalMs ?? SIX_HOURS;
  }

  private activeFor(jobName: string): boolean {
    const override = this.overridesByJob.get(jobName);
    return override?.active ?? true;
  }

  private isSuspendedNow(jobName: string): boolean {
    const now = DateTime.now().setZone("Africa/Johannesburg");
    if (this.suspendOnWeekendsAndHolidays && (now.weekday >= 6 || isSAPublicHoliday(now))) {
      return true;
    }
    const suspension = this.nightSuspensionFor(jobName);
    if (suspension) {
      const window = NIGHT_SUSPENSION_WINDOWS[suspension];
      if (window) {
        const hour = now.hour;
        return window.start > window.end
          ? hour >= window.start || hour < window.end
          : hour >= window.start && hour < window.end;
      }
    }
    return false;
  }

  async allJobs(): Promise<PollingJobDto[]> {
    await this.reloadOverrides();
    return Object.entries(POLLING_JOB_METADATA).map(([name, meta]) => ({
      name,
      description: meta.description,
      module: meta.module,
      active: this.activeFor(name),
      intervalMs: this.intervalFor(name),
      defaultIntervalMs: meta.defaultIntervalMs,
      nightSuspensionHours: this.nightSuspensionFor(name),
    }));
  }

  async runtimeConfig(): Promise<PollingJobRuntimeConfigDto> {
    await this.reloadOverrides();
    const jobs = Object.keys(POLLING_JOB_METADATA).reduce<PollingJobRuntimeConfigDto["jobs"]>(
      (acc, name) => {
        acc[name] = {
          active: this.activeFor(name),
          intervalMs: this.intervalFor(name),
          nightSuspensionHours: this.nightSuspensionFor(name),
          suspendedNow: this.isSuspendedNow(name),
        };
        return acc;
      },
      {},
    );
    return {
      jobs,
      suspendOnWeekendsAndHolidays: this.suspendOnWeekendsAndHolidays,
      serverTime: DateTime.now().toISO() as string,
    };
  }

  async globalSettings(): Promise<PollingJobsGlobalSettingsDto> {
    return { suspendOnWeekendsAndHolidays: this.suspendOnWeekendsAndHolidays };
  }

  async updateGlobalSettings(
    settings: PollingJobsGlobalSettingsDto,
  ): Promise<PollingJobsGlobalSettingsDto> {
    this.suspendOnWeekendsAndHolidays = settings.suspendOnWeekendsAndHolidays;
    await this.globalSettingsRepo.save({
      settingsKey: "default",
      suspendOnWeekendsAndHolidays: settings.suspendOnWeekendsAndHolidays,
    });
    return this.globalSettings();
  }

  private async upsertOverride(
    jobName: string,
    patch: Partial<Pick<PollingJobOverride, "active" | "intervalMs" | "nightSuspensionHours">>,
  ): Promise<PollingJobDto> {
    if (!POLLING_JOB_METADATA[jobName]) {
      throw new Error(`Unknown polling job: ${jobName}`);
    }
    const existing = this.overridesByJob.get(jobName);
    const merged: PollingJobOverride = {
      jobName,
      active: patch.active ?? existing?.active ?? true,
      intervalMs:
        patch.intervalMs !== undefined ? patch.intervalMs : (existing?.intervalMs ?? null),
      nightSuspensionHours:
        patch.nightSuspensionHours !== undefined
          ? patch.nightSuspensionHours
          : (existing?.nightSuspensionHours ?? null),
    };
    await this.overrideRepo.save(merged);
    this.overridesByJob.set(jobName, merged);
    const meta = POLLING_JOB_METADATA[jobName];
    return {
      name: jobName,
      description: meta.description,
      module: meta.module,
      active: merged.active,
      intervalMs: merged.intervalMs ?? meta.defaultIntervalMs,
      defaultIntervalMs: meta.defaultIntervalMs,
      nightSuspensionHours: this.nightSuspensionFor(jobName),
    };
  }

  pauseJob(jobName: string): Promise<PollingJobDto> {
    return this.upsertOverride(jobName, { active: false });
  }

  resumeJob(jobName: string): Promise<PollingJobDto> {
    return this.upsertOverride(jobName, { active: true });
  }

  updateInterval(jobName: string, intervalMs: number): Promise<PollingJobDto> {
    return this.upsertOverride(jobName, { intervalMs });
  }

  updateNightSuspension(
    jobName: string,
    nightSuspensionHours: NightSuspensionHours,
  ): Promise<PollingJobDto> {
    return this.upsertOverride(jobName, { nightSuspensionHours });
  }
}
