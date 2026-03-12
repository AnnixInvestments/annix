import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NixModule } from "../../nix/nix.module";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaAiController } from "./ai.controller";
import { ComplySaAiService } from "./ai.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaCompany, ComplySaComplianceStatus]), NixModule],
  controllers: [ComplySaAiController],
  providers: [ComplySaAiService],
})
export class ComplySaAiModule {}
