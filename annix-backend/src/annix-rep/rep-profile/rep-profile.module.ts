import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixRepAuthModule } from "../auth/annix-rep-auth.module";
import { RepProfileController } from "./rep-profile.controller";
import { RepProfileRepository } from "./rep-profile.repository";
import { MongoRepProfileRepository } from "./rep-profile.repository.mongo";
import { RepProfileService } from "./rep-profile.service";
import { RepProfileSchema } from "./schemas/rep-profile.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "RepProfile", schema: RepProfileSchema }]),
    AnnixRepAuthModule,
  ],
  controllers: [RepProfileController],
  providers: [
    RepProfileService,
    repositoryProvider(RepProfileRepository, MongoRepProfileRepository),
  ],
  exports: [RepProfileService],
})
export class RepProfileModule {}
