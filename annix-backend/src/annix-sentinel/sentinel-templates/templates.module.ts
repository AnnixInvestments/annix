import { Module } from "@nestjs/common";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelTemplatesController } from "./templates.controller";
import { AnnixSentinelTemplatesService } from "./templates.service";

@Module({
  imports: [AnnixSentinelComplianceModule],
  controllers: [AnnixSentinelTemplatesController],
  providers: [AnnixSentinelTemplatesService],
  exports: [AnnixSentinelTemplatesService],
})
export class AnnixSentinelTemplatesModule {}
