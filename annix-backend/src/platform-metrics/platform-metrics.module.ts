import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { RequestMetricsInterceptor } from "./request-metrics.interceptor";
import { RequestMetricsService } from "./request-metrics.service";
import { S3UsageService } from "./s3-usage.service";

@Module({
  providers: [
    RequestMetricsService,
    S3UsageService,
    { provide: APP_INTERCEPTOR, useClass: RequestMetricsInterceptor },
  ],
  exports: [RequestMetricsService, S3UsageService],
})
export class PlatformMetricsModule {}
