import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { ExtractionMetric } from "./entities/extraction-metric.entity";
import { ExtractionMetricRepository } from "./extraction-metric.repository";
import { MongoExtractionMetricRepository } from "./extraction-metric.repository.mongo";
import { PostgresExtractionMetricRepository } from "./extraction-metric.repository.postgres";
import { ExtractionMetricService } from "./extraction-metric.service";
import { MetricsController } from "./metrics.controller";
import { ExtractionMetricSchema } from "./schemas/extraction-metric.schema";

@Module({
  imports: [
    ConfigModule,
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "ExtractionMetric", schema: ExtractionMetricSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([ExtractionMetric])]),
    forwardRef(() => AdminModule),
  ],
  controllers: [MetricsController],
  providers: [
    ExtractionMetricService,
    repositoryProvider(
      ExtractionMetricRepository,
      PostgresExtractionMetricRepository,
      MongoExtractionMetricRepository,
    ),
  ],
  exports: [ExtractionMetricService],
})
export class MetricsModule {}
