import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { nowMillis } from "../lib/datetime";

export interface S3UsageSnapshot {
  sizeBytes: number;
  objectCount: number;
  computedAtMs: number;
  approximate: boolean;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_PAGES = 200;
const PAGE_SIZE = 1000;

interface EnumerationResult {
  sizeBytes: number;
  objectCount: number;
  approximate: boolean;
}

@Injectable()
export class S3UsageService {
  private readonly logger = new Logger(S3UsageService.name);
  private readonly enabled: boolean;
  private readonly bucketName: string;
  private readonly client: S3Client | null;
  private cache: S3UsageSnapshot | null = null;
  private refreshing = false;

  constructor(configService: ConfigService) {
    const storageType = (configService.get<string>("STORAGE_TYPE") || "local").toLowerCase();
    this.enabled = storageType === "s3";
    this.bucketName = configService.get<string>("AWS_S3_BUCKET") || "annix-sync-files";
    if (this.enabled) {
      const region = configService.get<string>("AWS_REGION") || "af-south-1";
      this.client = new S3Client({
        region,
        credentials: {
          accessKeyId: configService.get<string>("AWS_ACCESS_KEY_ID") || "",
          secretAccessKey: configService.get<string>("AWS_SECRET_ACCESS_KEY") || "",
        },
      });
    } else {
      this.client = null;
    }
  }

  snapshot(): S3UsageSnapshot | null {
    if (!this.enabled) return null;
    const cache = this.cache;
    const stale = cache === null || nowMillis() - cache.computedAtMs > CACHE_TTL_MS;
    if (stale) {
      void this.refresh();
    }
    return cache;
  }

  private async refresh(): Promise<void> {
    const client = this.client;
    if (this.refreshing || client === null) return;
    this.refreshing = true;
    try {
      const result = await this.enumerate(client, undefined, { sizeBytes: 0, objectCount: 0 }, 1);
      this.cache = {
        sizeBytes: result.sizeBytes,
        objectCount: result.objectCount,
        approximate: result.approximate,
        computedAtMs: nowMillis(),
      };
    } catch (error) {
      this.logger.warn(`S3 usage refresh failed: ${String(error)}`);
    } finally {
      this.refreshing = false;
    }
  }

  private async enumerate(
    client: S3Client,
    token: string | undefined,
    acc: { sizeBytes: number; objectCount: number },
    page: number,
  ): Promise<EnumerationResult> {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        ContinuationToken: token,
        MaxKeys: PAGE_SIZE,
      }),
    );
    const contents = response.Contents ?? [];
    const sizeBytes = acc.sizeBytes + contents.reduce((sum, object) => sum + (object.Size ?? 0), 0);
    const objectCount = acc.objectCount + contents.length;
    const nextToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    if (nextToken && page < MAX_PAGES) {
      return this.enumerate(client, nextToken, { sizeBytes, objectCount }, page + 1);
    }
    return { sizeBytes, objectCount, approximate: Boolean(nextToken) && page >= MAX_PAGES };
  }
}
