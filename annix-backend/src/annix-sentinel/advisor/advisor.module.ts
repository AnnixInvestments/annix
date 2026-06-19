import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { NixModule } from "../../nix/nix.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelAdvisorController } from "./advisor.controller";
import { AnnixSentinelAdvisorService } from "./advisor.service";
import { AnnixSentinelAdvisorClientRepository } from "./advisor-client.repository";
import { MongoAnnixSentinelAdvisorClientRepository } from "./advisor-client.repository.mongo";
import { AnnixSentinelCapabilities } from "./capabilities/annix-sentinel.capabilities";
import { AnnixSentinelAdvisorClientSchema } from "./schemas/advisor-client.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AnnixSentinelAdvisorClient", schema: AnnixSentinelAdvisorClientSchema },
    ]),
    AnnixSentinelComplianceModule,
    forwardRef(() => NixModule),
  ],
  controllers: [AnnixSentinelAdvisorController],
  providers: [
    AnnixSentinelAdvisorService,
    AnnixSentinelCapabilities,
    repositoryProvider(
      AnnixSentinelAdvisorClientRepository,
      MongoAnnixSentinelAdvisorClientRepository,
    ),
  ],
  exports: [AnnixSentinelAdvisorClientRepository],
})
export class AnnixSentinelAdvisorModule {}
