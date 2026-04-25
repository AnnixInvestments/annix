import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AnnixRepAuthModule } from "../annix-rep/auth/annix-rep-auth.module";
import { AuthModule } from "../auth/auth.module";
import { CustomerModule } from "../customer/customer.module";
import { CvAssistantModule } from "../cv-assistant/cv-assistant.module";
import { StockControlModule } from "../stock-control/stock-control.module";
import { SupplierModule } from "../supplier/supplier.module";
import { User } from "../user/entities/user.entity";
import { Passkey } from "./entities/passkey.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";
import { PasskeyConfig } from "./passkey.config";
import { PasskeyController } from "./passkey.controller";
import { PasskeyScheduler } from "./passkey.scheduler";
import { PasskeyService } from "./passkey.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Passkey, PasskeyChallenge, User]),
    AuthModule,
    forwardRef(() => AdminModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => SupplierModule),
    forwardRef(() => StockControlModule),
    forwardRef(() => AnnixRepAuthModule),
    forwardRef(() => CvAssistantModule),
  ],
  providers: [PasskeyService, PasskeyConfig, PasskeyScheduler],
  controllers: [PasskeyController],
  exports: [PasskeyService],
})
export class PasskeyModule {}
