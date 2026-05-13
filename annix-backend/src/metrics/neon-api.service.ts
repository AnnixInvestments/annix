import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { now, nowISO } from "../lib/datetime";

export interface NeonConsumption {
  configured: boolean;
  projectId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  computeTimeSeconds: number;
  activeTimeSeconds: number;
  writtenDataBytes: number;
  dataStorageBytesHour: number;
  syntheticStorageSizeBytes: number;
  fetchedAt: string;
  note: string | null;
}

interface NeonConsumptionApiResponse {
  periods?: Array<{
    period_id: string;
    period_start: string;
    period_end: string;
    consumption: {
      compute_time_seconds: number;
      active_time_seconds: number;
      written_data_bytes: number;
      data_storage_bytes_hour: number;
    };
  }>;
}

interface NeonProjectApiResponse {
  project?: {
    id: string;
    name: string;
    synthetic_storage_size?: number;
    quota_reset_at?: string;
    cpu_used_sec?: number;
  };
}

const NEON_API_BASE = "https://console.neon.tech/api/v2";

@Injectable()
export class NeonApiService {
  private readonly logger = new Logger(NeonApiService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey()) && Boolean(this.projectId());
  }

  private apiKey(): string | null {
    return this.config.get<string>("NEON_API_KEY") ?? null;
  }

  private projectId(): string | null {
    return this.config.get<string>("NEON_PROJECT_ID") ?? null;
  }

  async currentConsumption(): Promise<NeonConsumption> {
    const apiKey = this.apiKey();
    const projectId = this.projectId();
    const fetchedAt = nowISO();

    if (!apiKey || !projectId) {
      return {
        configured: false,
        projectId,
        periodStart: null,
        periodEnd: null,
        computeTimeSeconds: 0,
        activeTimeSeconds: 0,
        writtenDataBytes: 0,
        dataStorageBytesHour: 0,
        syntheticStorageSizeBytes: 0,
        fetchedAt,
        note: "NEON_API_KEY and NEON_PROJECT_ID env vars are required.",
      };
    }

    try {
      const [consumption, project] = await Promise.all([
        this.fetchConsumption(apiKey, projectId),
        this.fetchProject(apiKey, projectId),
      ]);

      const period = consumption.periods?.[0];
      const projectInfo = project.project;

      return {
        configured: true,
        projectId,
        periodStart: period?.period_start ?? null,
        periodEnd: period?.period_end ?? null,
        computeTimeSeconds: period?.consumption.compute_time_seconds ?? 0,
        activeTimeSeconds: period?.consumption.active_time_seconds ?? 0,
        writtenDataBytes: period?.consumption.written_data_bytes ?? 0,
        dataStorageBytesHour: period?.consumption.data_storage_bytes_hour ?? 0,
        syntheticStorageSizeBytes: projectInfo?.synthetic_storage_size ?? 0,
        fetchedAt,
        note: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Neon API fetch failed: ${message}`);
      return {
        configured: true,
        projectId,
        periodStart: null,
        periodEnd: null,
        computeTimeSeconds: 0,
        activeTimeSeconds: 0,
        writtenDataBytes: 0,
        dataStorageBytesHour: 0,
        syntheticStorageSizeBytes: 0,
        fetchedAt,
        note: `Neon API error: ${message}`,
      };
    }
  }

  private async fetchConsumption(
    apiKey: string,
    projectId: string,
  ): Promise<NeonConsumptionApiResponse> {
    const url = `${NEON_API_BASE}/consumption_history/projects/${encodeURIComponent(projectId)}?from=${encodeURIComponent(monthStartIso())}&to=${encodeURIComponent(nowISO())}&granularity=monthly`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`consumption_history HTTP ${response.status}`);
    }
    return response.json() as Promise<NeonConsumptionApiResponse>;
  }

  private async fetchProject(apiKey: string, projectId: string): Promise<NeonProjectApiResponse> {
    const url = `${NEON_API_BASE}/projects/${encodeURIComponent(projectId)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`project HTTP ${response.status}`);
    }
    return response.json() as Promise<NeonProjectApiResponse>;
  }
}

function monthStartIso(): string {
  return now().toUTC().startOf("month").toISO() ?? "";
}
