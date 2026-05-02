import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExtractionMetric } from "./entities/extraction-metric.entity";
import { ExtractionMetricService } from "./extraction-metric.service";
import { MetricsController } from "./metrics.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ExtractionMetric])],
  controllers: [MetricsController],
  providers: [ExtractionMetricService],
  exports: [ExtractionMetricService],
})
export class MetricsModule {}
