import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaIntegrationsController } from "./integrations.controller";
import { ComplySaIntegrationsService } from "./integrations.service";
import { SageService } from "./sage/sage.service";
import { ComplySaSageConnection } from "./sage/sage-connection.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaSageConnection])],
  controllers: [ComplySaIntegrationsController],
  providers: [ComplySaIntegrationsService, SageService],
  exports: [ComplySaIntegrationsService, SageService],
})
export class ComplySaIntegrationsModule {}
