import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { AnnixOrbitModule } from "../annix-orbit/annix-orbit.module";
import { AnnixRepAuthModule } from "../annix-rep/auth/annix-rep-auth.module";
import { AuthModule } from "../auth/auth.module";
import { CustomerModule } from "../customer/customer.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StockControlModule } from "../stock-control/stock-control.module";
import { SupplierModule } from "../supplier/supplier.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PasskeyConfig } from "./passkey.config";
import { PasskeyController } from "./passkey.controller";
import { PasskeyRepository } from "./passkey.repository";
import { MongoPasskeyRepository } from "./passkey.repository.mongo";
import { PasskeyScheduler } from "./passkey.scheduler";
import { PasskeyService } from "./passkey.service";
import { PasskeyChallengeRepository } from "./passkey-challenge.repository";
import { MongoPasskeyChallengeRepository } from "./passkey-challenge.repository.mongo";
import { PasskeySchema } from "./schemas/passkey.schema";
import { PasskeyChallengeSchema } from "./schemas/passkey-challenge.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Passkey", schema: PasskeySchema },
      { name: "PasskeyChallenge", schema: PasskeyChallengeSchema },
      { name: "User", schema: UserSchema },
    ]),
    AuthModule,
    forwardRef(() => AdminModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => SupplierModule),
    forwardRef(() => StockControlModule),
    forwardRef(() => AnnixRepAuthModule),
    forwardRef(() => AnnixOrbitModule),
  ],
  providers: [
    PasskeyService,
    PasskeyConfig,
    PasskeyScheduler,
    repositoryProvider(PasskeyRepository, MongoPasskeyRepository),
    repositoryProvider(PasskeyChallengeRepository, MongoPasskeyChallengeRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
  ],
  controllers: [PasskeyController],
  exports: [PasskeyService],
})
export class PasskeyModule {}
