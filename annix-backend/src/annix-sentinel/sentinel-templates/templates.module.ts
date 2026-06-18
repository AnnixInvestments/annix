import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelTemplatesController } from "./templates.controller";
import { AnnixSentinelTemplatesService } from "./templates.service";

@Module({
  imports: [TypeOrmModule.forFeature([Company]), AnnixSentinelComplianceModule],
  controllers: [AnnixSentinelTemplatesController],
  providers: [AnnixSentinelTemplatesService],
  exports: [AnnixSentinelTemplatesService],
})
export class AnnixSentinelTemplatesModule {}
