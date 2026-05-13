import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { ExtractionMetric } from "./entities/extraction-metric.entity";
import { ExtractionMetricService } from "./extraction-metric.service";
import { MetricsController } from "./metrics.controller";
import { NeonApiService } from "./neon-api.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ExtractionMetric]),
    forwardRef(() => AdminModule),
  ],
  controllers: [MetricsController],
  providers: [ExtractionMetricService, NeonApiService],
  exports: [ExtractionMetricService, NeonApiService],
})
export class MetricsModule {}
