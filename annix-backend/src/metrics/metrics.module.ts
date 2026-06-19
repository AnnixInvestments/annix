import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { ExtractionMetricRepository } from "./extraction-metric.repository";
import { MongoExtractionMetricRepository } from "./extraction-metric.repository.mongo";
import { ExtractionMetricService } from "./extraction-metric.service";
import { MetricsController } from "./metrics.controller";
import { ExtractionMetricSchema } from "./schemas/extraction-metric.schema";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: "ExtractionMetric", schema: ExtractionMetricSchema }]),
    forwardRef(() => AdminModule),
  ],
  controllers: [MetricsController],
  providers: [
    ExtractionMetricService,
    repositoryProvider(ExtractionMetricRepository, MongoExtractionMetricRepository),
  ],
  exports: [ExtractionMetricService],
})
export class MetricsModule {}
