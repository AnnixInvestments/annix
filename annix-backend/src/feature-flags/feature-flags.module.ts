import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FeatureFlag } from "./entities/feature-flag.entity";
import { FeatureFlagsController } from "./feature-flags.controller";
import { FeatureFlagRepository } from "./feature-flags.repository";
import { MongoFeatureFlagRepository } from "./feature-flags.repository.mongo";
import { PostgresFeatureFlagRepository } from "./feature-flags.repository.postgres";
import { FeatureFlagsService } from "./feature-flags.service";
import { FeatureFlagSchema } from "./schemas/feature-flag.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "FeatureFlag", schema: FeatureFlagSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FeatureFlag])]),
    ConfigModule,
    forwardRef(() => AdminModule),
  ],
  providers: [
    FeatureFlagsService,
    repositoryProvider(
      FeatureFlagRepository,
      PostgresFeatureFlagRepository,
      MongoFeatureFlagRepository,
    ),
  ],
  controllers: [FeatureFlagsController],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
