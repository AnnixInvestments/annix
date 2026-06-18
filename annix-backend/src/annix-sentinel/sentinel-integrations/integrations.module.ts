import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelIntegrationsController } from "./integrations.controller";
import { AnnixSentinelIntegrationsService } from "./integrations.service";
import { SageService } from "./sage/sage.service";
import { AnnixSentinelSageConnection } from "./sage/sage-connection.entity";
import { AnnixSentinelSageConnectionRepository } from "./sage/sage-connection.repository";
import { MongoAnnixSentinelSageConnectionRepository } from "./sage/sage-connection.repository.mongo";
import { PostgresAnnixSentinelSageConnectionRepository } from "./sage/sage-connection.repository.postgres";
import { AnnixSentinelSageConnectionSchema } from "./sage/schemas/sage-connection.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            {
              name: "AnnixSentinelSageConnection",
              schema: AnnixSentinelSageConnectionSchema,
            },
          ]),
        ]
      : [TypeOrmModule.forFeature([AnnixSentinelSageConnection])]),
  ],
  controllers: [AnnixSentinelIntegrationsController],
  providers: [
    AnnixSentinelIntegrationsService,
    SageService,
    repositoryProvider(
      AnnixSentinelSageConnectionRepository,
      PostgresAnnixSentinelSageConnectionRepository,
      MongoAnnixSentinelSageConnectionRepository,
    ),
  ],
  exports: [AnnixSentinelIntegrationsService, SageService],
})
export class AnnixSentinelIntegrationsModule {}
