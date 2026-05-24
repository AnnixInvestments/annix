import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnnixSentinelIntegrationsController } from "./integrations.controller";
import { AnnixSentinelIntegrationsService } from "./integrations.service";
import { SageService } from "./sage/sage.service";
import { AnnixSentinelSageConnection } from "./sage/sage-connection.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AnnixSentinelSageConnection])],
  controllers: [AnnixSentinelIntegrationsController],
  providers: [AnnixSentinelIntegrationsService, SageService],
  exports: [AnnixSentinelIntegrationsService, SageService],
})
export class AnnixSentinelIntegrationsModule {}
