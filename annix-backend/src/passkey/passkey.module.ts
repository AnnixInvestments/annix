import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { User } from "../user/entities/user.entity";
import { Passkey } from "./entities/passkey.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";
import { PasskeyConfig } from "./passkey.config";
import { PasskeyController } from "./passkey.controller";
import { PasskeyScheduler } from "./passkey.scheduler";
import { PasskeyService } from "./passkey.service";

@Module({
  imports: [TypeOrmModule.forFeature([Passkey, PasskeyChallenge, User]), AuthModule],
  providers: [PasskeyService, PasskeyConfig, PasskeyScheduler],
  controllers: [PasskeyController],
  exports: [PasskeyService],
})
export class PasskeyModule {}
