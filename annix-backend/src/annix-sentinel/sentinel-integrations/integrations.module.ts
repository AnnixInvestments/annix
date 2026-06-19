import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelIntegrationsController } from "./integrations.controller";
import { AnnixSentinelIntegrationsService } from "./integrations.service";
import { SageService } from "./sage/sage.service";
import { AnnixSentinelSageConnectionRepository } from "./sage/sage-connection.repository";
import { MongoAnnixSentinelSageConnectionRepository } from "./sage/sage-connection.repository.mongo";
import { AnnixSentinelSageConnectionSchema } from "./sage/schemas/sage-connection.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "AnnixSentinelSageConnection",
        schema: AnnixSentinelSageConnectionSchema,
      },
    ]),
  ],
  controllers: [AnnixSentinelIntegrationsController],
  providers: [
    AnnixSentinelIntegrationsService,
    SageService,
    repositoryProvider(
      AnnixSentinelSageConnectionRepository,
      MongoAnnixSentinelSageConnectionRepository,
    ),
  ],
  exports: [AnnixSentinelIntegrationsService, SageService],
})
export class AnnixSentinelIntegrationsModule {}
