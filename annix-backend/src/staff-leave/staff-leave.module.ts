import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../platform/entities/company.entity";
import { StockControlCompany } from "../stock-control/entities/stock-control-company.entity";
import { StockControlProfile } from "../stock-control/entities/stock-control-profile.entity";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { StockControlAuthGuard } from "../stock-control/guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../stock-control/guards/stock-control-role.guard";
import { StorageModule } from "../storage/storage.module";
import { StaffLeaveController } from "./controllers/staff-leave.controller";
import { StaffLeaveRecord } from "./entities/staff-leave-record.entity";
import { StaffLeaveEnabledGuard } from "./guards/staff-leave-enabled.guard";
import { StaffLeaveService } from "./services/staff-leave.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffLeaveRecord,
      StockControlCompany,
      StockControlUser,
      StockControlProfile,
      Company,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
      }),
    }),
    StorageModule,
  ],
  controllers: [StaffLeaveController],
  providers: [
    StaffLeaveService,
    StaffLeaveEnabledGuard,
    StockControlAuthGuard,
    StockControlRoleGuard,
  ],
  exports: [StaffLeaveService],
})
export class StaffLeaveModule {}
