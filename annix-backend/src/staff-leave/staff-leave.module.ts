import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StockControlAuthGuard } from "../stock-control/guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../stock-control/guards/stock-control-role.guard";
import { StockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.mongo";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { StockControlCompanySchema } from "../stock-control/schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { StorageModule } from "../storage/storage.module";
import { StaffLeaveController } from "./controllers/staff-leave.controller";
import { StaffLeaveEnabledGuard } from "./guards/staff-leave-enabled.guard";
import { StaffLeaveRecordSchema } from "./schemas/staff-leave-record.schema";
import { StaffLeaveService } from "./services/staff-leave.service";
import { StaffLeaveRecordRepository } from "./staff-leave-record.repository";
import { MongoStaffLeaveRecordRepository } from "./staff-leave-record.repository.mongo";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "StaffLeaveRecord", schema: StaffLeaveRecordSchema },
      { name: "StockControlUser", schema: StockControlUserSchema },
      { name: "StockControlCompany", schema: StockControlCompanySchema },
      { name: "StockControlProfile", schema: StockControlProfileSchema },
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
    repositoryProvider(StaffLeaveRecordRepository, MongoStaffLeaveRecordRepository),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
  ],
  exports: [StaffLeaveService],
})
export class StaffLeaveModule {}
