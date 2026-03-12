import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaAiController } from "./ai.controller";
import { ComplySaAiService } from "./ai.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaCompany, ComplySaComplianceStatus])],
  controllers: [ComplySaAiController],
  providers: [ComplySaAiService],
})
export class ComplySaAiModule {}
