import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NixModule } from "../../nix/nix.module";
import { AnnixSentinelComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { AnnixSentinelAdvisorController } from "./advisor.controller";
import { AnnixSentinelAdvisorService } from "./advisor.service";
import { AnnixSentinelCapabilities } from "./capabilities/annix-sentinel.capabilities";
import { AnnixSentinelAdvisorClient } from "./entities/advisor-client.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([AnnixSentinelAdvisorClient, AnnixSentinelComplianceStatus]),
    forwardRef(() => NixModule),
  ],
  controllers: [AnnixSentinelAdvisorController],
  providers: [AnnixSentinelAdvisorService, AnnixSentinelCapabilities],
})
export class AnnixSentinelAdvisorModule {}
