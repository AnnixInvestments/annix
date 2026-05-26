import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AnnixOrbitModule } from "../annix-orbit/annix-orbit.module";
import { AnnixRepAuthModule } from "../annix-rep/auth/annix-rep-auth.module";
import { AuthModule } from "../auth/auth.module";
import { CustomerModule } from "../customer/customer.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StockControlModule } from "../stock-control/stock-control.module";
import { SupplierModule } from "../supplier/supplier.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { Passkey } from "./entities/passkey.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";
import { PasskeyConfig } from "./passkey.config";
import { PasskeyController } from "./passkey.controller";
import { PasskeyRepository } from "./passkey.repository";
import { MongoPasskeyRepository } from "./passkey.repository.mongo";
import { PostgresPasskeyRepository } from "./passkey.repository.postgres";
import { PasskeyScheduler } from "./passkey.scheduler";
import { PasskeyService } from "./passkey.service";
import { PasskeyChallengeRepository } from "./passkey-challenge.repository";
import { MongoPasskeyChallengeRepository } from "./passkey-challenge.repository.mongo";
import { PostgresPasskeyChallengeRepository } from "./passkey-challenge.repository.postgres";
import { PasskeySchema } from "./schemas/passkey.schema";
import { PasskeyChallengeSchema } from "./schemas/passkey-challenge.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Passkey", schema: PasskeySchema },
            { name: "PasskeyChallenge", schema: PasskeyChallengeSchema },
            { name: "User", schema: UserSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([Passkey, PasskeyChallenge, User])]),
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
    repositoryProvider(PasskeyRepository, PostgresPasskeyRepository, MongoPasskeyRepository),
    repositoryProvider(
      PasskeyChallengeRepository,
      PostgresPasskeyChallengeRepository,
      MongoPasskeyChallengeRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
  ],
  controllers: [PasskeyController],
  exports: [PasskeyService],
})
export class PasskeyModule {}
