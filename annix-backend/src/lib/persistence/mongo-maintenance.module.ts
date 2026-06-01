import { Module } from "@nestjs/common";
import { MongoMaintenanceService } from "./mongo-maintenance.service";

@Module({
  providers: [MongoMaintenanceService],
  exports: [MongoMaintenanceService],
})
export class MongoMaintenanceModule {}
