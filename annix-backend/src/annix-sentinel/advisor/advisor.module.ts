import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { NixModule } from "../../nix/nix.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelAdvisorController } from "./advisor.controller";
import { AnnixSentinelAdvisorService } from "./advisor.service";
import { AnnixSentinelAdvisorClientRepository } from "./advisor-client.repository";
import { MongoAnnixSentinelAdvisorClientRepository } from "./advisor-client.repository.mongo";
import { PostgresAnnixSentinelAdvisorClientRepository } from "./advisor-client.repository.postgres";
import { AnnixSentinelCapabilities } from "./capabilities/annix-sentinel.capabilities";
import { AnnixSentinelAdvisorClient } from "./entities/advisor-client.entity";
import { AnnixSentinelAdvisorClientSchema } from "./schemas/advisor-client.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AnnixSentinelAdvisorClient", schema: AnnixSentinelAdvisorClientSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([AnnixSentinelAdvisorClient])]),
    AnnixSentinelComplianceModule,
    forwardRef(() => NixModule),
  ],
  controllers: [AnnixSentinelAdvisorController],
  providers: [
    AnnixSentinelAdvisorService,
    AnnixSentinelCapabilities,
    repositoryProvider(
      AnnixSentinelAdvisorClientRepository,
      PostgresAnnixSentinelAdvisorClientRepository,
      MongoAnnixSentinelAdvisorClientRepository,
    ),
  ],
  exports: [AnnixSentinelAdvisorClientRepository],
})
export class AnnixSentinelAdvisorModule {}
