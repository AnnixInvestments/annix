import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StockControlCompany } from "../stock-control/entities/stock-control-company.entity";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { StorageModule } from "../storage/storage.module";
import { StaffLeaveController } from "./controllers/staff-leave.controller";
import { StaffLeaveRecord } from "./entities/staff-leave-record.entity";
import { StaffLeaveEnabledGuard } from "./guards/staff-leave-enabled.guard";
import { StaffLeaveService } from "./services/staff-leave.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffLeaveRecord, StockControlCompany, StockControlUser]),
    StorageModule,
  ],
  controllers: [StaffLeaveController],
  providers: [StaffLeaveService, StaffLeaveEnabledGuard],
  exports: [StaffLeaveService],
})
export class StaffLeaveModule {}
