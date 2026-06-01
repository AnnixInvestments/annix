import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixRepAuthModule } from "../auth/annix-rep-auth.module";
import { VoiceProfileSchema } from "./schemas/voice-profile.schema";
import { VoiceFilterController } from "./voice-filter.controller";
import { VoiceProfile } from "./voice-filter.entity";
import { VoiceProfileRepository } from "./voice-filter.repository";
import { MongoVoiceProfileRepository } from "./voice-filter.repository.mongo";
import { PostgresVoiceProfileRepository } from "./voice-filter.repository.postgres";
import { VoiceFilterService } from "./voice-filter.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "VoiceProfile", schema: VoiceProfileSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([VoiceProfile])]),
    AnnixRepAuthModule,
  ],
  controllers: [VoiceFilterController],
  providers: [
    VoiceFilterService,
    repositoryProvider(
      VoiceProfileRepository,
      PostgresVoiceProfileRepository,
      MongoVoiceProfileRepository,
    ),
  ],
  exports: [VoiceFilterService],
})
export class VoiceFilterModule {}
