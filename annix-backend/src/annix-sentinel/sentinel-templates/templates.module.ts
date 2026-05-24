import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { AnnixSentinelTemplatesController } from "./templates.controller";
import { AnnixSentinelTemplatesService } from "./templates.service";

@Module({
  imports: [TypeOrmModule.forFeature([Company, AnnixSentinelComplianceStatus])],
  controllers: [AnnixSentinelTemplatesController],
  providers: [AnnixSentinelTemplatesService],
  exports: [AnnixSentinelTemplatesService],
})
export class AnnixSentinelTemplatesModule {}
