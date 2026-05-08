import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NixModule } from "../../nix/nix.module";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaAdvisorController } from "./advisor.controller";
import { ComplySaAdvisorService } from "./advisor.service";
import { ComplySaCapabilities } from "./capabilities/comply-sa.capabilities";
import { ComplySaAdvisorClient } from "./entities/advisor-client.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplySaAdvisorClient, ComplySaComplianceStatus]),
    forwardRef(() => NixModule),
  ],
  controllers: [ComplySaAdvisorController],
  providers: [ComplySaAdvisorService, ComplySaCapabilities],
})
export class ComplySaAdvisorModule {}
