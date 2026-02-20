import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Prospect } from "../entities/prospect.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { GooglePlacesProvider, OsmOverpassProvider, YellowPagesProvider } from "./providers";

@Module({
  imports: [TypeOrmModule.forFeature([Prospect, RepProfile]), ConfigModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, GooglePlacesProvider, YellowPagesProvider, OsmOverpassProvider],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
