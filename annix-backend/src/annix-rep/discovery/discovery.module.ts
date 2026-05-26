import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixRepAuthModule } from "../auth";
import { Prospect } from "../entities";
import { ProspectRepository } from "../prospect.repository";
import { MongoProspectRepository } from "../prospect.repository.mongo";
import { PostgresProspectRepository } from "../prospect.repository.postgres";
import { RepProfile } from "../rep-profile";
import { RepProfileRepository } from "../rep-profile/rep-profile.repository";
import { MongoRepProfileRepository } from "../rep-profile/rep-profile.repository.mongo";
import { PostgresRepProfileRepository } from "../rep-profile/rep-profile.repository.postgres";
import { RepProfileSchema } from "../rep-profile/schemas/rep-profile.schema";
import { ProspectSchema } from "../schemas/prospect.schema";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { GooglePlacesProvider, OsmOverpassProvider, YellowPagesProvider } from "./providers";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Prospect", schema: ProspectSchema },
            { name: "RepProfile", schema: RepProfileSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([Prospect, RepProfile])]),
    ConfigModule,
    AnnixRepAuthModule,
  ],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    GooglePlacesProvider,
    YellowPagesProvider,
    OsmOverpassProvider,
    repositoryProvider(ProspectRepository, PostgresProspectRepository, MongoProspectRepository),
    repositoryProvider(
      RepProfileRepository,
      PostgresRepProfileRepository,
      MongoRepProfileRepository,
    ),
  ],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
