import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixRepAuthModule } from "../auth/annix-rep-auth.module";
import { VoiceProfileSchema } from "./schemas/voice-profile.schema";
import { VoiceFilterController } from "./voice-filter.controller";
import { VoiceProfileRepository } from "./voice-filter.repository";
import { MongoVoiceProfileRepository } from "./voice-filter.repository.mongo";
import { VoiceFilterService } from "./voice-filter.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "VoiceProfile", schema: VoiceProfileSchema }]),
    AnnixRepAuthModule,
  ],
  controllers: [VoiceFilterController],
  providers: [
    VoiceFilterService,
    repositoryProvider(VoiceProfileRepository, MongoVoiceProfileRepository),
  ],
  exports: [VoiceFilterService],
})
export class VoiceFilterModule {}
