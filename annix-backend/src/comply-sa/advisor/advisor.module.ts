import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaAdvisorController } from "./advisor.controller";
import { ComplySaAdvisorService } from "./advisor.service";
import { ComplySaAdvisorClient } from "./entities/advisor-client.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaAdvisorClient, ComplySaComplianceStatus])],
  controllers: [ComplySaAdvisorController],
  providers: [ComplySaAdvisorService],
})
export class ComplySaAdvisorModule {}
