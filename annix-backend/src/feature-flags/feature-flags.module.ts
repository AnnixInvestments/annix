import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FeatureFlagsController } from "./feature-flags.controller";
import { FeatureFlagRepository } from "./feature-flags.repository";
import { MongoFeatureFlagRepository } from "./feature-flags.repository.mongo";
import { FeatureFlagsService } from "./feature-flags.service";
import { FeatureFlagSchema } from "./schemas/feature-flag.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "FeatureFlag", schema: FeatureFlagSchema }]),
    ConfigModule,
    forwardRef(() => AdminModule),
  ],
  providers: [
    FeatureFlagsService,
    repositoryProvider(FeatureFlagRepository, MongoFeatureFlagRepository),
  ],
  controllers: [FeatureFlagsController],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
