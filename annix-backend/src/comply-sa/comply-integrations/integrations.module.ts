import { Module } from "@nestjs/common";
import { ComplySaIntegrationsController } from "./integrations.controller";
import { ComplySaIntegrationsService } from "./integrations.service";

@Module({
  controllers: [ComplySaIntegrationsController],
  providers: [ComplySaIntegrationsService],
  exports: [ComplySaIntegrationsService],
})
export class ComplySaIntegrationsModule {}
