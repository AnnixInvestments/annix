import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixRepAuthModule } from "../auth";
import { ProspectRepository } from "../prospect.repository";
import { MongoProspectRepository } from "../prospect.repository.mongo";
import { RepProfileRepository } from "../rep-profile/rep-profile.repository";
import { MongoRepProfileRepository } from "../rep-profile/rep-profile.repository.mongo";
import { RepProfileSchema } from "../rep-profile/schemas/rep-profile.schema";
import { ProspectSchema } from "../schemas/prospect.schema";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { GooglePlacesProvider, OsmOverpassProvider, YellowPagesProvider } from "./providers";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Prospect", schema: ProspectSchema },
      { name: "RepProfile", schema: RepProfileSchema },
    ]),
    ConfigModule,
    AnnixRepAuthModule,
  ],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    GooglePlacesProvider,
    YellowPagesProvider,
    OsmOverpassProvider,
    repositoryProvider(ProspectRepository, MongoProspectRepository),
    repositoryProvider(RepProfileRepository, MongoRepProfileRepository),
  ],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
