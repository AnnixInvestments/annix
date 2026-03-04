import { Controller, Get } from "@nestjs/common";

interface MemoryHealth {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
  arrayBuffersMB: number;
}

@Controller()
export class AppController {
  @Get("health")
  healthCheck(): string {
    return "ok";
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
