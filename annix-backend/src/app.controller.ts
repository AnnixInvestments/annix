import { Controller, Get, Optional } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { SkipThrottle } from "@nestjs/throttler";
import type { Connection } from "mongoose";
import { ORBIT_CONNECTION } from "./lib/persistence/mongo-connections";

interface MemoryHealth {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
  arrayBuffersMB: number;
}

interface ConnectionHealth {
  connected: boolean;
  database: string | null;
  host: string | null;
}

@SkipThrottle({ global: true })
@Controller()
export class AppController {
  constructor(
    @Optional() @InjectConnection() private readonly mainConnection?: Connection,
    @Optional() @InjectConnection(ORBIT_CONNECTION) private readonly orbitConnection?: Connection,
  ) {}

  @Get("health")
  healthCheck(): string {
    return "ok";
  }

  // Reports the databases the RUNNING process is actually connected to (not what
  // .env says). Lets scripts/db-env.mjs catch swarm-vs-.env drift on both the
  // main and Orbit connections.
  @Get("health/db")
  dbHealth(): { main: ConnectionHealth; orbit: ConnectionHealth } {
    const describe = (connection?: Connection): ConnectionHealth => ({
      connected: connection?.readyState === 1,
      database: connection?.db?.databaseName ?? null,
      host: connection?.host ?? null,
    });
    return {
      main: describe(this.mainConnection),
      orbit: describe(this.orbitConnection),
    };
  }

  @Get("health/memory")
  memoryHealth(): MemoryHealth {
    const usage = process.memoryUsage();
    const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024);
    return {
      heapUsedMB: toMB(usage.heapUsed),
      heapTotalMB: toMB(usage.heapTotal),
      rssMB: toMB(usage.rss),
      externalMB: toMB(usage.external),
      arrayBuffersMB: toMB(usage.arrayBuffers),
    };
  }
}
