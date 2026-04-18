import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NixModule } from "../../nix/nix.module";
import { Company } from "../../platform/entities/company.entity";
import { StorageModule } from "../../storage/storage.module";
import { ComplySaComplianceRequirement } from "../compliance/entities/compliance-requirement.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaAiController } from "./ai.controller";
import { ComplySaAiService } from "./ai.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, ComplySaComplianceStatus, ComplySaComplianceRequirement]),
    NixModule,
    StorageModule,
  ],
  controllers: [ComplySaAiController],
  providers: [ComplySaAiService],
  exports: [ComplySaAiService],
})
export class ComplySaAiModule {}
