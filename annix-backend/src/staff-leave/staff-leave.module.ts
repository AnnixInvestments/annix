import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { Company } from "../platform/entities/company.entity";
import { StockControlCompany } from "../stock-control/entities/stock-control-company.entity";
import { StockControlProfile } from "../stock-control/entities/stock-control-profile.entity";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { StockControlAuthGuard } from "../stock-control/guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../stock-control/guards/stock-control-role.guard";
import { StockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.mongo";
import { PostgresStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.postgres";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { PostgresStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.postgres";
import { StockControlCompanySchema } from "../stock-control/schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { StorageModule } from "../storage/storage.module";
import { StaffLeaveController } from "./controllers/staff-leave.controller";
import { StaffLeaveRecord } from "./entities/staff-leave-record.entity";
import { StaffLeaveEnabledGuard } from "./guards/staff-leave-enabled.guard";
import { StaffLeaveRecordSchema } from "./schemas/staff-leave-record.schema";
import { StaffLeaveService } from "./services/staff-leave.service";
import { StaffLeaveRecordRepository } from "./staff-leave-record.repository";
import { MongoStaffLeaveRecordRepository } from "./staff-leave-record.repository.mongo";
import { PostgresStaffLeaveRecordRepository } from "./staff-leave-record.repository.postgres";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "StaffLeaveRecord", schema: StaffLeaveRecordSchema },
            { name: "StockControlUser", schema: StockControlUserSchema },
            { name: "StockControlCompany", schema: StockControlCompanySchema },
            { name: "StockControlProfile", schema: StockControlProfileSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            StaffLeaveRecord,
            StockControlCompany,
            StockControlUser,
            StockControlProfile,
            Company,
          ]),
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
    repositoryProvider(
      StaffLeaveRecordRepository,
      PostgresStaffLeaveRecordRepository,
      MongoStaffLeaveRecordRepository,
    ),
    repositoryProvider(
      StockControlCompanyRepository,
      PostgresStockControlCompanyRepository,
      MongoStockControlCompanyRepository,
    ),
    repositoryProvider(
      StockControlProfileRepository,
      PostgresStockControlProfileRepository,
      MongoStockControlProfileRepository,
    ),
  ],
  exports: [StaffLeaveService],
})
export class StaffLeaveModule {}
