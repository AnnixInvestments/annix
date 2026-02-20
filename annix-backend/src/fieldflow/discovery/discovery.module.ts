import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnnixRepAuthModule } from "../auth";
import { Prospect } from "../entities";
import { RepProfile } from "../rep-profile";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { GooglePlacesProvider, OsmOverpassProvider, YellowPagesProvider } from "./providers";

@Module({
  imports: [TypeOrmModule.forFeature([Prospect, RepProfile]), ConfigModule, AnnixRepAuthModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, GooglePlacesProvider, YellowPagesProvider, OsmOverpassProvider],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
