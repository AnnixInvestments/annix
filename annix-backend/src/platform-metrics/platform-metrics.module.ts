import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { RequestMetricsInterceptor } from "./request-metrics.interceptor";
import { RequestMetricsService } from "./request-metrics.service";

@Module({
  providers: [
    RequestMetricsService,
    { provide: APP_INTERCEPTOR, useClass: RequestMetricsInterceptor },
  ],
  exports: [RequestMetricsService],
})
export class PlatformMetricsModule {}
