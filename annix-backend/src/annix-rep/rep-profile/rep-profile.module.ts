import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixRepAuthModule } from "../auth/annix-rep-auth.module";
import { RepProfileController } from "./rep-profile.controller";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileRepository } from "./rep-profile.repository";
import { MongoRepProfileRepository } from "./rep-profile.repository.mongo";
import { PostgresRepProfileRepository } from "./rep-profile.repository.postgres";
import { RepProfileService } from "./rep-profile.service";
import { RepProfileSchema } from "./schemas/rep-profile.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "RepProfile", schema: RepProfileSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([RepProfile])]),
    AnnixRepAuthModule,
  ],
  controllers: [RepProfileController],
  providers: [
    RepProfileService,
    repositoryProvider(
      RepProfileRepository,
      PostgresRepProfileRepository,
      MongoRepProfileRepository,
    ),
  ],
  exports: [RepProfileService],
})
export class RepProfileModule {}
