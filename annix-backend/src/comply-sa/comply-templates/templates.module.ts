import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaTemplatesController } from "./templates.controller";
import { ComplySaTemplatesService } from "./templates.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaCompany, ComplySaComplianceStatus])],
  controllers: [ComplySaTemplatesController],
  providers: [ComplySaTemplatesService],
  exports: [ComplySaTemplatesService],
})
export class ComplySaTemplatesModule {}
